import {
  Injectable, NotFoundException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateAppointmentDto) {
    const appointment = await this.prisma.appointment.create({
      data: {
        leadName: dto.leadName,
        phone:    dto.phone,
        email:    dto.email,
        topic:    dto.topic,
        date:     new Date(dto.date),
        duration: dto.duration ?? 30,
        status:   dto.status ?? 'scheduled',
        tenantId,
        leadId:   dto.leadId,
        agentId:  dto.agentId,
      },
    });

    this.auditService.log({
      action: 'APPOINTMENT_CREATED',
      resource: 'appointment',
      resourceId: appointment.id,
      details: { leadName: appointment.leadName, date: appointment.date },
      tenantId,
      userId,
    });

    return appointment;
  }

  async findAll(tenantId: string, query: { status?: string; from?: string; to?: string }) {
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async overview(tenantId: string, query: { from?: string; to?: string }) {
    const range: any = {};
    if (query.from) range.gte = new Date(query.from);
    if (query.to) range.lte = new Date(query.to);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(Object.keys(range).length ? { date: range } : {}),
      },
    });

    const completed = appointments.filter(a => a.status === 'completed');
    const cancelled = appointments.filter(a => a.status === 'cancelled');
    const noShow = appointments.filter(a => a.status === 'no_show');

    const showUpRatio = appointments.length
      ? (((appointments.length - cancelled.length - noShow.length) / appointments.length) * 100).toFixed(1)
      : '0';

    const avgDurationMins = appointments.length
      ? Math.round(appointments.reduce((sum, a) => sum + a.duration, 0) / appointments.length)
      : 0;

    return {
      total: appointments.length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      showUpRatio,
      avgDurationMins,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateAppointmentDto) {
    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);

    const result = await this.prisma.tenantUpdate(
      this.prisma.appointment,
      tenantId,
      id,
      data,
    );

    this.auditService.log({
      action: 'APPOINTMENT_UPDATED',
      resource: 'appointment',
      resourceId: id,
      details: { changes: Object.keys(dto) },
      tenantId,
    });

    return result;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Appointment not found');

    const result = await this.prisma.appointment.delete({ where: { id } });

    this.auditService.log({
      action: 'APPOINTMENT_DELETED',
      resource: 'appointment',
      resourceId: id,
      tenantId,
    });

    return result;
  }
}
