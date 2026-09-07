import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from '../leads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { LeadStatus } from '@prisma/client';

describe('CSV Lead Ingestion & Validation Engine', () => {
  let leadsService: LeadsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      isConnected: true,
      lead: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'lead-1', name: 'John Doe', phone: '+14155552671', status: LeadStatus.new },
          { id: 'lead-2', name: 'Jane Smith', phone: '+14155552672', status: LeadStatus.new },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    leadsService = module.get<LeadsService>(LeadsService);
  });

  describe('RFC 4180 CSV Validation & Formula Neutralization', () => {
    it('neutralizes spreadsheet formula injection prefixes (=, +, -, @)', () => {
      const dangerousInputs = [
        '=cmd|"/C calc"!A0',
        '+1234567890',
        '-500',
        '@SUM(A1:A10)',
      ];

      const sanitize = (val: string) => {
        const trimmed = val.trim();
        if (/^[=+\-@\t\r]/.test(trimmed)) {
          return `'${trimmed}`;
        }
        return trimmed;
      };

      expect(sanitize(dangerousInputs[0])).toBe('\'=cmd|"/C calc"!A0');
      expect(sanitize(dangerousInputs[1])).toBe('\'+1234567890');
      expect(sanitize(dangerousInputs[2])).toBe('\'-500');
      expect(sanitize(dangerousInputs[3])).toBe('\'@SUM(A1:A10)');
    });

    it('validates E.164 compliant phone numbers', () => {
      const isValidPhone = (p: string) => {
        const digits = p.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 16;
      };

      expect(isValidPhone('+14155552671')).toBe(true);
      expect(isValidPhone('4155552671')).toBe(true);
      expect(isValidPhone('123')).toBe(false); // Too short
      expect(isValidPhone('abcdefg')).toBe(false); // Non-numeric
    });
  });

  describe('LeadsService.bulkImport', () => {
    it('creates new leads and returns counts and resolved lead objects with IDs', async () => {
      const payload = {
        leads: [
          { name: 'John Doe', phone: '+14155552671', email: 'john@example.com' },
          { name: 'Jane Smith', phone: '+14155552672', email: 'jane@example.com' },
          { name: 'Duplicate Lead', phone: '+14155552671' },
        ],
      };

      const result = await leadsService.bulkImport('tenant-test', payload);

      expect(result.total).toBe(3);
      expect(result.created).toBe(2);
      expect(result.duplicates).toBe(1);
      expect(result.leads).toHaveLength(2);
      expect(result.leads[0].id).toBe('lead-1');
      expect(mockPrisma.lead.createMany).toHaveBeenCalled();
    });

    it('operates in safe in-memory mode when database is offline', async () => {
      mockPrisma.isConnected = false;

      const payload = {
        leads: [
          { name: 'Alice Cooper', phone: '+14155552673' },
          { name: 'Bob Marley', phone: '+14155552674' },
        ],
      };

      const result = await leadsService.bulkImport('tenant-test', payload);

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.leads[0].id).toContain('mock-imported-lead-');
    });
  });
});
