import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DunningService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: number) {
    const records = await this.prisma.dunningRecord.findMany({
      where: { organizationId },
      orderBy: { notifiedAt: "desc" },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            clientName: true,
            total: true,
            balanceDue: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    return {
      dunning: records.map((r) => ({
        id: r.id,
        invoice_id: r.invoiceId,
        invoice_number: r.invoice.invoiceNumber ?? `INV-${r.invoiceId}`,
        client_name: r.invoice.clientName,
        total: Number(r.invoice.total),
        balance_due: Number(r.invoice.balanceDue),
        due_date: r.invoice.dueDate?.toISOString().split("T")[0] ?? "",
        status: r.invoice.status,
        level: r.level,
        days_overdue: r.daysOverdue,
        notified_at: r.notifiedAt.toISOString().split("T")[0],
        notes: r.notes ?? "",
      })),
    };
  }
}
