import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITelephonyProvider } from '../interfaces/telephony-provider.interface';
import { TwilioTelephonyProvider } from './twilio.provider';
import { ExotelTelephonyProvider } from './exotel.provider';
import { SandboxTelephonyProvider } from './sandbox.provider';

@Injectable()
export class TelephonyProviderRegistry {
  private readonly logger = new Logger(TelephonyProviderRegistry.name);
  private readonly providers = new Map<string, ITelephonyProvider>();

  constructor(
    private configService: ConfigService,
    private twilioProvider: TwilioTelephonyProvider,
    private exotelProvider: ExotelTelephonyProvider,
    private sandboxProvider: SandboxTelephonyProvider,
  ) {
    this.register(this.twilioProvider);
    this.register(this.exotelProvider);
    this.register(this.sandboxProvider);
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
    const candidate = this.providers.get(preferred);

    // If preferred carrier has live credentials, use it
    if (candidate && candidate.isConfigured) {
      return candidate;
    }

    // If Exotel has live credentials, use it
    if (this.exotelProvider.isConfigured) {
      return this.exotelProvider;
    }

    // Graceful fallback to Sandbox provider for development & WebRTC voice testing
    this.logger.log(
      `No live carrier credentials configured in .env. Using [sandbox] WebRTC provider for interactive voice testing.`,
    );
    return this.sandboxProvider;
  }

  getAllProviders(): Array<{ name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      isConfigured: p.isConfigured,
    }));
  }
}
