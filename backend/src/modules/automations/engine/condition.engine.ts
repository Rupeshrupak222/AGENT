import { Injectable, Logger } from '@nestjs/common';
import { TemplateContext } from './template.engine';

export type ConditionOperator =
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'contains'
  | 'not_contains'
  | 'exists';

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

export interface ConditionGroup {
  logic?: 'AND' | 'OR';
  conditions: (AutomationCondition | ConditionGroup)[];
}

@Injectable()
export class ConditionEngine {
  private readonly logger = new Logger(ConditionEngine.name);

  /**
   * Evaluate a condition or list of conditions against context.
   * Returns true if conditions match, false otherwise.
   */
  evaluate(
    conditions: AutomationCondition[] | ConditionGroup | null | undefined,
    context: TemplateContext,
  ): boolean {
    if (!conditions) return true;

    // Handle array of conditions (default AND)
    if (Array.isArray(conditions)) {
      if (conditions.length === 0) return true;
      return conditions.every((c) => this.evaluateSingleCondition(c, context));
    }

    // Handle ConditionGroup
    if (conditions.conditions && Array.isArray(conditions.conditions)) {
      if (conditions.conditions.length === 0) return true;
      const isOr = conditions.logic?.toUpperCase() === 'OR';

      if (isOr) {
        return conditions.conditions.some((c) =>
          'conditions' in c ? this.evaluate(c as ConditionGroup, context) : this.evaluateSingleCondition(c as AutomationCondition, context),
        );
      }

      return conditions.conditions.every((c) =>
        'conditions' in c ? this.evaluate(c as ConditionGroup, context) : this.evaluateSingleCondition(c as AutomationCondition, context),
      );
    }

    return true;
  }

  private evaluateSingleCondition(cond: AutomationCondition, context: TemplateContext): boolean {
    if (!cond || !cond.field) return true;

    const actualValue = this.resolveFieldValue(cond.field, context);
    const expectedValue = cond.value;

    switch (cond.operator) {
      case '==':
        return this.compareEquals(actualValue, expectedValue);

      case '!=':
        return !this.compareEquals(actualValue, expectedValue);

      case '>':
        return Number(actualValue) > Number(expectedValue);

      case '>=':
        return Number(actualValue) >= Number(expectedValue);

      case '<':
        return Number(actualValue) < Number(expectedValue);

      case '<=':
        return Number(actualValue) <= Number(expectedValue);

      case 'contains':
        if (actualValue === null || actualValue === undefined) return false;
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue);
        }
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());

      case 'not_contains':
        if (actualValue === null || actualValue === undefined) return true;
        if (Array.isArray(actualValue)) {
          return !actualValue.includes(expectedValue);
        }
        return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());

      case 'in':
        if (!Array.isArray(expectedValue)) {
          const splitValues = String(expectedValue).split(',').map((s) => s.trim().toLowerCase());
          return splitValues.includes(String(actualValue).toLowerCase());
        }
        return expectedValue.map((v) => String(v).toLowerCase()).includes(String(actualValue).toLowerCase());

      case 'exists':
        return actualValue !== undefined && actualValue !== null && actualValue !== '';

      default:
        this.logger.warn(`Unknown condition operator: ${cond.operator}`);
        return false;
    }
  }

  private compareEquals(actual: any, expected: any): boolean {
    if (actual === expected) return true;
    if (actual === null || actual === undefined) {
      return expected === null || expected === undefined || expected === '';
    }
    // Compare booleans
    if (typeof expected === 'boolean') {
      return Boolean(actual) === expected;
    }
    // Compare numbers
    if (typeof expected === 'number' || (!isNaN(Number(expected)) && typeof actual === 'number')) {
      return Number(actual) === Number(expected);
    }
    // Case-insensitive string comparison
    return String(actual).toLowerCase() === String(expected).toLowerCase();
  }

  /**
   * Resolves field value from context supporting common aliases:
   * e.g. 'leadScore' -> context.analysis?.leadScore || context.lead?.score
   *      'intent' -> context.analysis?.intent
   *      'sentiment' -> context.analysis?.sentiment
   *      'lead.status' -> context.lead?.status
   */
  private resolveFieldValue(field: string, context: TemplateContext): any {
    const lower = field.toLowerCase().trim();

    // Direct aliases
    if (lower === 'leadscore' || lower === 'score') {
      return context.analysis?.leadScore ?? context.lead?.score;
    }
    if (lower === 'intent') {
      return context.analysis?.intent;
    }
    if (lower === 'sentiment') {
      return context.analysis?.sentiment;
    }
    if (lower === 'qualification') {
      return context.analysis?.qualification ?? context.lead?.status;
    }
    if (lower === 'duration' || lower === 'callduration') {
      return context.call?.duration;
    }
    if (lower === 'outcome' || lower === 'calloutcome') {
      return context.call?.outcome;
    }
    if (lower === 'leadstatus' || lower === 'status') {
      return context.lead?.status ?? context.call?.status;
    }
    if (lower === 'campaignid') {
      return context.call?.campaignId ?? context.lead?.campaignId;
    }

    // Dot-notation navigation (e.g. 'lead.score', 'analysis.intent')
    const parts = field.split('.');
    let cur: any = context;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[p];
    }
    return cur;
  }
}
