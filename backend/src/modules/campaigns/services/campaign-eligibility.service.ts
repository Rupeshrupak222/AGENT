import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null;
  reason?: string;
}

export interface CallingWindowResult {
  inWindow: boolean;
  reason?: string;
}

export interface DailyLimitResult {
  withinLimit: boolean;
  dispatchedToday: number;
  limit: number | null;
}

export interface LeadEligibilityResult {
  isEligible: boolean;
  reason?: string;
  normalizedPhone?: string;
}

@Injectable()
export class CampaignEligibilityService {
  private readonly logger = new Logger(CampaignEligibilityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Normalizes phone numbers to standard E.164 format.
   * Special handling for Indian (+91) and North American (+1) standards.
   */
  normalizePhoneNumber(rawPhone: string): PhoneValidationResult {
    if (!rawPhone || typeof rawPhone !== 'string') {
      return { isValid: false, normalized: null, reason: 'Empty or invalid phone number value' };
    }

    // Strip whitespace, dashes, dots, brackets
    const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]+/g, '');

    // Already E.164 with '+'
    if (cleaned.startsWith('+')) {
      const digitsOnly = cleaned.slice(1);
      if (/^\d{7,15}$/.test(digitsOnly)) {
        return { isValid: true, normalized: `+${digitsOnly}` };
      }
      return { isValid: false, normalized: null, reason: 'Invalid E.164 digit length (must be 7-15 digits)' };
    }

    // Indian 10-digit mobile number: starts with 6, 7, 8, or 9
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: `+91${cleaned}` };
    }

    // Indian 11-digit starting with 0
    if (/^0[6-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: `+91${cleaned.slice(1)}` };
    }

    // Indian 12-digit starting with 91
    if (/^91[6-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: `+${cleaned}` };
    }

    // North American 10-digit: starts with 2-9
    if (/^[2-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: `+1${cleaned}` };
    }

    // North American 11-digit starting with 1
    if (/^1[2-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: `+${cleaned}` };
    }

    return { isValid: false, normalized: null, reason: 'Could not normalize to verified E.164 phone format' };
  }

  /**
   * Checks if current time is within the campaign calling hours and active days.
   */
  isWithinCallingWindow(
    startTime?: string | null,
    endTime?: string | null,
    daysOfWeek?: number[] | null,
    currentTime: Date = new Date(),
  ): CallingWindowResult {
    // 1. Day of week check (0=Sunday, 1=Monday... 6=Saturday)
    const currentDay = currentTime.getDay();
    if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(currentDay)) {
      return {
        inWindow: false,
        reason: `Current day (${currentDay}) is not within campaign active days [${daysOfWeek.join(',')}]`,
      };
    }

    // 2. Time of day check (HH:mm in 24h format)
    if (startTime && endTime) {
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      const currentMinutesOfDay = currentHours * 60 + currentMinutes;

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const startMinutesOfDay = startH * 60 + (startM || 0);
      const endMinutesOfDay = endH * 60 + (endM || 0);

      if (currentMinutesOfDay < startMinutesOfDay || currentMinutesOfDay > endMinutesOfDay) {
        return {
          inWindow: false,
          reason: `Current time (${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}) is outside window ${startTime} - ${endTime}`,
        };
      }
    }

    return { inWindow: true };
  }

  /**
   * Enforces server-side daily call limit for a campaign.
   */
  async checkDailyLimit(
    tenantId: string,
    campaignId: string,
    callsPerDay?: number | null,
    today: Date = new Date(),
  ): Promise<DailyLimitResult> {
    if (!callsPerDay || callsPerDay <= 0) {
      return { withinLimit: true, dispatchedToday: 0, limit: null };
    }

    if (!this.prisma.isConnected) {
      // In offline development, allow up to limit
      return { withinLimit: true, dispatchedToday: 0, limit: callsPerDay };
    }

    try {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const count = await this.prisma.call.count({
        where: {
          tenantId,
          campaignId,
          startedAt: { gte: startOfDay },
        },
      });

      return {
        withinLimit: count < callsPerDay,
        dispatchedToday: count,
        limit: callsPerDay,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to query daily calls count for campaign ${campaignId}: ${err.message}`);
      return { withinLimit: true, dispatchedToday: 0, limit: callsPerDay };
    }
  }

  /**
   * Validates lead eligibility before dialing.
   */
  async validateLeadEligibility(
    tenantId: string,
    campaignLead: {
      id: string;
      leadId: string;
      status: string;
      attemptCount: number;
      lead?: { id: string; phone: string; deletedAt?: Date | null; status?: string };
    },
    maxAttempts = 3,
  ): Promise<LeadEligibilityResult> {
    const lead = campaignLead.lead;
    if (!lead) {
      return { isEligible: false, reason: 'Lead record not found' };
    }

    if (lead.deletedAt) {
      return { isEligible: false, reason: 'Lead has been deleted' };
    }

    // Status eligibility: must be pending or retry_pending
    if (campaignLead.status !== 'pending' && campaignLead.status !== 'retry_pending') {
      return {
        isEligible: false,
        reason: `Campaign lead is already in '${campaignLead.status}' status (must be pending or retry_pending)`,
      };
    }

    // Max attempts check
    if (campaignLead.attemptCount >= maxAttempts) {
      return {
        isEligible: false,
        reason: `Lead attempt count (${campaignLead.attemptCount}) reached maxAttempts limit (${maxAttempts})`,
      };
    }

    // Phone normalization
    const phoneRes = this.normalizePhoneNumber(lead.phone);
    if (!phoneRes.isValid || !phoneRes.normalized) {
      return { isEligible: false, reason: phoneRes.reason || 'Invalid phone number' };
    }

    // Check if lead currently has an active call in progress
    if (this.prisma.isConnected) {
      try {
        const activeCall = await this.prisma.call.findFirst({
          where: {
            tenantId,
            leadId: lead.id,
            status: { in: ['queued', 'ringing', 'in_progress'] },
          },
        });
        if (activeCall) {
          return { isEligible: false, reason: `Lead already has active call (${activeCall.id}) in progress` };
        }
      } catch (err: any) {
        this.logger.debug(`Could not check active call status: ${err.message}`);
      }
    }

    return { isEligible: true, normalizedPhone: phoneRes.normalized };
  }
}
