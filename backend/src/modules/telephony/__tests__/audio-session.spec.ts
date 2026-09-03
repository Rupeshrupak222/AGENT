import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AudioSessionService } from '../services/audio-session.service';

describe('AudioSessionService (Tenant Isolation & Lifecycle)', () => {
  let service: AudioSessionService;

  beforeEach(() => {
    service = new AudioSessionService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should create an audio session and retrieve it for the same tenant', () => {
    const session = service.createSession({
      callId: 'call-1',
      tenantId: 'tenant-alpha',
      provider: 'twilio',
      direction: 'outbound',
    });

    expect(session.sessionId).toBeDefined();
    expect(session.state).toBe('initializing');

    const retrieved = service.getSession(session.sessionId, 'tenant-alpha');
    expect(retrieved.callId).toBe('call-1');
  });

  it('should strictly reject access when requested by another tenant (tenant isolation breach)', () => {
    const session = service.createSession({
      callId: 'call-secret-2',
      tenantId: 'tenant-acme',
      provider: 'twilio',
      direction: 'inbound',
    });

    expect(() => {
      service.getSession(session.sessionId, 'tenant-hacker');
    }).toThrow(ForbiddenException);
  });

  it('should prevent cross-tenant duplicate session collision on the same callId', () => {
    service.createSession({
      callId: 'call-collision',
      tenantId: 'tenant-legit',
      provider: 'twilio',
      direction: 'outbound',
    });

    expect(() => {
      service.createSession({
        callId: 'call-collision',
        tenantId: 'tenant-imposter',
        provider: 'twilio',
        direction: 'outbound',
      });
    }).toThrow(ForbiddenException);
  });

  it('should record inbound frames and update state to active', () => {
    const session = service.createSession({
      callId: 'call-3',
      tenantId: 'tenant-alpha',
      provider: 'twilio',
      direction: 'inbound',
    });

    service.recordInboundFrame(session.sessionId, 160);
    const updated = service.getSession(session.sessionId, 'tenant-alpha');

    expect(updated.state).toBe('active');
    expect(updated.metrics.inboundFramesCount).toBe(1);
    expect(updated.metrics.inboundBytes).toBe(160);
  });

  it('should cleanly close session and purge lookup mapping', () => {
    const session = service.createSession({
      callId: 'call-4',
      tenantId: 'tenant-alpha',
      provider: 'twilio',
      direction: 'outbound',
    });

    const closed = service.closeSession(session.sessionId, 'tenant-alpha');
    expect(closed).toBe(true);

    expect(() => service.getSession(session.sessionId, 'tenant-alpha')).toThrow(NotFoundException);
    expect(service.getSessionByCallId('call-4')).toBeNull();
  });
});
