import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Canonical calendar-provider error codes (mapped from raw provider errors).
 * Every adapter normalizes provider failures into these codes so the
 * scheduling service treats providers uniformly and never leaks raw
 * API payloads or secrets to clients.
 */
export enum CalendarErrorCode {
  AUTH_FAILED = 'CALENDAR_AUTH_FAILED',
  RATE_LIMITED = 'CALENDAR_RATE_LIMITED',
  SLOT_UNAVAILABLE = 'CALENDAR_SLOT_UNAVAILABLE',
  SLOT_CONFLICT = 'CALENDAR_SLOT_CONFLICT',
  BOOKING_FAILED = 'CALENDAR_BOOKING_FAILED',
  CANCELLATION_FAILED = 'CALENDAR_CANCELLATION_FAILED',
  RESCHEDULE_FAILED = 'CALENDAR_RESCHEDULE_FAILED',
  NOT_FOUND = 'CALENDAR_NOT_FOUND',
  TIMEOUT = 'CALENDAR_TIMEOUT',
  PROVIDER_ERROR = 'CALENDAR_PROVIDER_ERROR',
  VALIDATION = 'CALENDAR_VALIDATION',
}

export interface CalendarProviderErrorShape {
  code: CalendarErrorCode;
  message: string;
  isRetryable: boolean;
  underlying?: string;
}

@Injectable()
export class CalendarErrorFactory {
  /** Maps a raw adapter failure into a Nest HTTP exception (with redacted detail). */
  toHttpException(error: CalendarProviderErrorShape | unknown): HttpException {
    const shape = this.toShape(error);

    switch (shape.code) {
      case CalendarErrorCode.AUTH_FAILED:
        return new UnauthorizedException({
          success: false,
          errorCode: shape.code,
          message: 'Calendar provider authentication failed. Re-link the provider from Settings.',
        });
      case CalendarErrorCode.RATE_LIMITED:
        return new HttpException(
          {
            success: false,
            errorCode: shape.code,
            message: 'Calendar provider rate limit exceeded. Try again shortly.',
          },
          429,
        );
      case CalendarErrorCode.SLOT_UNAVAILABLE:
      case CalendarErrorCode.SLOT_CONFLICT:
        return new ConflictException({
          success: false,
          errorCode: shape.code,
          message: 'That time slot is no longer available. Please pick another one.',
        });
      case CalendarErrorCode.BOOKING_FAILED:
      case CalendarErrorCode.RESCHEDULE_FAILED:
      case CalendarErrorCode.CANCELLATION_FAILED:
        return new ConflictException({
          success: false,
          errorCode: shape.code,
          message: 'The calendar provider could not complete this action.',
        });
      case CalendarErrorCode.NOT_FOUND:
        return new NotFoundException({
          success: false,
          errorCode: shape.code,
          message: 'The appointment or provider record was not found.',
        });
      case CalendarErrorCode.TIMEOUT:
        return new GatewayTimeoutException({
          success: false,
          errorCode: shape.code,
          message: 'The calendar provider timed out. Your request was not lost — try again.',
        });
      case CalendarErrorCode.VALIDATION:
        return new BadRequestException({
          success: false,
          errorCode: shape.code,
          message: 'Invalid scheduling request.',
        });
      case CalendarErrorCode.PROVIDER_ERROR:
      default:
        return new ServiceUnavailableException({
          success: false,
          errorCode: shape.code ?? CalendarErrorCode.PROVIDER_ERROR,
          message: 'The calendar provider returned an error. Please try again.',
        });
    }
  }

  toShape(error: CalendarProviderErrorShape | unknown): CalendarProviderErrorShape {
    if (error && typeof error === 'object' && 'code' in error) {
      const e = error as CalendarProviderErrorShape;
      return {
        code: e.code ?? CalendarErrorCode.PROVIDER_ERROR,
        message: e.message ?? 'Calendar provider error',
        isRetryable: e.isRetryable ?? false,
        underlying: e.underlying,
      };
    }
    return {
      code: CalendarErrorCode.PROVIDER_ERROR,
      message: error instanceof Error ? error.message : String(error),
      isRetryable: false,
    };
  }
}

/** Normalized failure thrown by adapters; caught by the scheduling service. */
export class CalendarProviderException extends Error {
  constructor(
    public readonly code: CalendarErrorCode,
    message: string,
    public readonly isRetryable = false,
    public readonly underlying?: string,
  ) {
    super(message);
    this.name = 'CalendarProviderException';
  }

  toShape(): CalendarProviderErrorShape {
    return {
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      underlying: this.underlying,
    };
  }
}