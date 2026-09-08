import { Injectable, Logger } from '@nestjs/common';

export interface TemplateContext {
  lead?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    designation?: string;
    score?: number;
    status?: string;
    [key: string]: any;
  };
  call?: {
    id?: string;
    summary?: string;
    outcome?: string;
    duration?: number;
    sentimentScore?: number;
    intentScore?: number;
    [key: string]: any;
  };
  analysis?: {
    summary?: string;
    leadScore?: number;
    intent?: string;
    sentiment?: string;
    qualification?: string;
    keyTakeaways?: string[];
    actionItems?: string[];
    [key: string]: any;
  };
  appointment?: {
    date?: string | Date;
    time?: string;
    topic?: string;
    status?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

@Injectable()
export class TemplateEngine {
  private readonly logger = new Logger(TemplateEngine.name);

  // Allowed root objects
  private readonly ALLOWED_ROOTS = new Set(['lead', 'call', 'analysis', 'appointment', 'agent', 'tenant']);

  // Disallowed patterns that could hint at injection or secret leakage
  private readonly FORBIDDEN_KEYS = new Set([
    'process', 'env', 'secret', 'token', 'password', 'key', 'apiKey', 'jwt',
    '__proto__', 'constructor', 'prototype', 'database_url', 'credentials',
  ]);

  /**
   * Render a string template safely replacing {{variable}} with context values.
   */
  render(template: string, context: TemplateContext = {}): string {
    if (!template || typeof template !== 'string') return '';

    // Regex matches {{var}} or {{ var }} or {{nested.var}}
    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, expression: string) => {
      const parts = expression.split('.');

      // Handle direct top-level aliases first
      if (parts.length === 1) {
        const single = parts[0].toLowerCase();
        if (this.FORBIDDEN_KEYS.has(single)) return '';

        // Aliases
        if (single === 'name' || single === 'lead_name') return context.lead?.name ?? '';
        if (single === 'phone' || single === 'lead_phone') return context.lead?.phone ?? '';
        if (single === 'email' || single === 'lead_email') return context.lead?.email ?? '';
        if (single === 'company' || single === 'lead_company') return context.lead?.company ?? '';
        if (single === 'agent_name') return (context as any).agent?.name ?? 'Agent';
        if (single === 'call_duration') return context.call?.duration ? `${context.call.duration}s` : '';
        if (single === 'call_summary') return context.call?.summary ?? context.analysis?.summary ?? '';

        // Top-level property if present in context
        const directVal = (context as any)[parts[0]];
        if (directVal !== undefined && typeof directVal !== 'object') {
          return String(directVal);
        }
        return '';
      }

      // Handle nested property like {{lead.name}} or {{analysis.intent}}
      const [root, ...subPath] = parts;
      if (!this.ALLOWED_ROOTS.has(root.toLowerCase())) {
        return '';
      }

      // Ensure no forbidden keys in path
      for (const p of subPath) {
        if (this.FORBIDDEN_KEYS.has(p.toLowerCase())) {
          return '';
        }
      }

      let current: any = (context as any)[root];
      for (const part of subPath) {
        if (current === null || current === undefined) {
          return '';
        }
        current = current[part];
      }

      if (current === undefined || current === null) return '';
      if (typeof current === 'object') {
        if (Array.isArray(current)) return current.join(', ');
        return '';
      }
      return String(current);
    });
  }

  /**
   * Sanitizes header fields (e.g. Email Subject, From, To) to prevent CRLF injection.
   */
  sanitizeHeader(headerValue: string): string {
    if (!headerValue || typeof headerValue !== 'string') return '';
    // Strip carriage returns, newlines, and null bytes
    return headerValue.replace(/[\r\n\0]/g, ' ').trim();
  }

  /**
   * Sanitizes HTML to strip scripts, javascript: links, and harmful event handlers.
   */
  sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, 'src=""');
  }
}
