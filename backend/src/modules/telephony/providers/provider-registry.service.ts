import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITelephonyProvider } from '../interfaces/telephony-provider.interface';
import { TwilioTelephonyProvider } from './twilio.provider';
import { ExotelTelephonyProvider } from './exotel.provider';

@Injectable()
export class TelephonyProviderRegistry {
  private readonly logger = new Logger(TelephonyProviderRegistry.name);
  private readonly providers = new Map<string, ITelephonyProvider>();

  constructor(
    private configService: ConfigService,
    private twilioProvider: TwilioTelephonyProvider,
    private exotelProvider: ExotelTelephonyProvider,
  ) {
    this.register(this.twilioProvider);
    this.register(this.exotelProvider);
  }

  register(provider: ITelephonyProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
    this.logger.log(`Registered telephony provider: ${provider.name} (configured: ${provider.isConfigured})`);
  }

  get(name: string): ITelephonyProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new NotFoundException(`Telephony provider "${name}" not found. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  getDefaultProvider(): ITelephonyProvider {
    const preferred = this.configService.get<string>('TELEPHONY_PROVIDER', 'twilio').toLowerCase();
    if (this.providers.has(preferred)) {
      return this.providers.get(preferred)!;
    }
    // Fallback to first registered
    const first = this.providers.values().next().value;
    if (!first) {
      throw new NotFoundException('No telephony providers available');
    }
    return first;
  }

  getAllProviders(): Array<{ name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      isConfigured: p.isConfigured,
    }));
  }
}
