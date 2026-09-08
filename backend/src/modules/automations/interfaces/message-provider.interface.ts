export interface MessageSendResult {
  success: boolean;
  providerMessageId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'queued' | 'skipped';
  error?: string;
  isRetryable?: boolean;
  metadata?: Record<string, any>;
}

export interface WhatsAppSendOptions {
  to: string; // E.164 phone number
  templateName?: string;
  languageCode?: string;
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'image' | 'document';
      text?: string;
      [key: string]: any;
    }>;
  }>;
  textBody?: string;
  variables?: Record<string, string>;
}

export interface EmailSendOptions {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface ConnectionTestResult {
  success: boolean;
  provider: string;
  message: string;
  latencyMs?: number;
  details?: Record<string, any>;
}

export interface WhatsAppWebhookStatusUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipientId: string;
  timestamp: number;
  error?: {
    code: number;
    title: string;
    message?: string;
  };
}

export interface AutomationTriggerEvent {
  trigger: string;
  tenantId: string;
  leadId?: string;
  callId?: string;
  campaignId?: string;
  appointmentId?: string;
  metadata?: Record<string, any>;
  data?: {
    lead?: Record<string, any>;
    call?: Record<string, any>;
    analysis?: Record<string, any>;
    appointment?: Record<string, any>;
    [key: string]: any;
  };
}
