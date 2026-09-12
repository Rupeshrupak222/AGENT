import 'reflect-metadata';
import { CallsGateway } from '../calls.gateway';
import { MetricsService } from '../../../common/services/metrics.service';

/**
 * Day 24 — WebSocket tenant-isolation regression contract.
 *
 * Requirement: an authenticated Tenant A user attempting to join a Tenant B
 * campaign room must be DENIED, and no event published for Tenant B may ever
 * be routed into Tenant A's rooms.
 */

describe('Day 24 WebSocket Tenant Isolation Suite', () => {
  let gateway: CallsGateway;
  let mockJwt: any;
  let mockConfig: any;
  let mockPrisma: any;
  let mockAudit: any;
  let metrics: MetricsService;
  let emitCalls: string[][];

  beforeEach(() => {
    mockJwt = { verifyAsync: jest.fn() };
    mockConfig = { get: jest.fn().mockReturnValue('jwt-secret') };
    mockPrisma = {
      isConnected: true,
      call: { findFirst: jest.fn() },
      campaign: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
      tenant: { findUnique: jest.fn() },
    };
    mockAudit = { log: jest.fn() };
    metrics = new MetricsService();

    emitCalls = [];
    const mockRoom = (room: string) => ({
      emit: (event: string, body: any) => {
        emitCalls.push([room, event]);
        return mockRoom;
      },
    });
    gateway = new CallsGateway(mockJwt, mockConfig, mockPrisma, mockAudit, metrics);
    gateway.server = {
      to: jest.fn().mockImplementation((room: string) => mockRoom(room)),
    } as any;
  });

  function tenantClient(tenantId: string, role = 'agent') {
    return {
      id: `sock-${tenantId}`,
      userId: `user-${tenantId}`,
      tenantId,
      role,
      join: jest.fn(),
    } as any;
  }

  it('DENIES Tenant A user joining a Tenant B campaign room', async () => {
    const clientA = tenantClient('tenant-a');

    // campaign belongs to tenant-b; tenant-a query returns nothing
    mockPrisma.campaign.findFirst.mockResolvedValue(null);

    const result = await gateway.handleJoinCampaign(clientA, { campaignId: 'camp-tenant-b' });

    expect(result).toEqual({ event: 'error', message: 'Campaign not found' });
    expect(clientA.join).not.toHaveBeenCalledWith('campaign:camp-tenant-b');
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CROSS_TENANT_ACCESS_ATTEMPT',
        resource: 'campaign',
        resourceId: 'camp-tenant-b',
        tenantId: 'tenant-a',
      }),
    );
  });

  it('allows a Tenant A user to join their own tenant campaign room', async () => {
    const clientA = tenantClient('tenant-a');
    mockPrisma.campaign.findFirst.mockResolvedValue({
      id: 'camp-tenant-a',
      status: 'running',
    });

    const result = await gateway.handleJoinCampaign(clientA, { campaignId: 'camp-tenant-a' });

    expect(result).toEqual({ event: 'joined:campaign', status: 'ok', campaignId: 'camp-tenant-a' });
    expect(clientA.join).toHaveBeenCalledWith('campaign:camp-tenant-a');
  });

  it('routes campaign events ONLY into the owning tenant rooms (no cross-tenant egress)', () => {
    gateway.broadcastCampaignStatus('camp-tenant-b', 'tenant-b', { status: 'running' });
    gateway.broadcastCampaignProgress('camp-tenant-b', 'tenant-b', { processed: 1, total: 2 });

    const roomsEmitted = emitCalls.map(([room]) => room);
    expect(roomsEmitted).toContain('campaign:camp-tenant-b');
    expect(roomsEmitted).toContain('tenant:tenant-b');
    expect(roomsEmitted).not.toContain('tenant:tenant-a');
    expect(roomsEmitted).not.toContain('campaign:camp-tenant-a');
  });

  it('routes CRM sync status into the owning tenant room only', () => {
    gateway.broadcastCrmSyncStatus('tenant-b', { provider: 'mock', status: 'synced' });

    const roomsEmitted = emitCalls.map(([room]) => room);
    expect(roomsEmitted).toEqual(['tenant:tenant-b']);
    expect(roomsEmitted).not.toContain('tenant:tenant-a');
  });
});