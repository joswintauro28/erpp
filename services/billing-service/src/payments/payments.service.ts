import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getAccountIds(organizationId: number) {
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, code: { in: ["1001", "1002"] } },
      select: { code: true, id: true },
    });
    const map = new Map(accounts.map((a) => [a.code, a.id]));
    return {
      cashBankId: map.get("1001"),
      arId: map.get("1002"),
    };
  }

  async findAll(organizationId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            clientName: true,
          },
        },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      paymentId: `PAY-${String(p.id).padStart(4, "0")}`,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice?.invoiceNumber ?? `INV-${p.invoiceId}`,
      clientName: p.invoice?.clientName ?? "Unknown",
      amount: Number(p.amount),
      refundedAmount: p.status === "refunded" ? Number(p.amount) : 0,
      method: p.paymentMethod ?? "Unknown",
      reference: p.referenceId ?? "",
      date: p.paymentDate?.toISOString().split("T")[0] ?? "",
      status: p.status,
    }));
  }

  async create(organizationId: number, dto: CreatePaymentDto) {
    const { cashBankId, arId } = await this.getAccountIds(organizationId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, organizationId },
      });
      if (!invoice) throw new NotFoundException("Invoice not found");

      const paidAmount = Number(invoice.paidAmount) + Number(dto.amount);
      const total = Number(invoice.total);
      let newStatus = invoice.status;

      if (paidAmount >= total) {
        newStatus = "paid";
      } else if (paidAmount > 0) {
        newStatus = "partially_paid";
      }

      const payment = await tx.payment.create({
        data: {
          organizationId,
          invoiceId: dto.invoiceId,
          amount: new Prisma.Decimal(dto.amount),
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          referenceId: dto.referenceId,
          notes: dto.notes,
        },
      });

      const balanceDue = total - paidAmount;
      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          paidAmount: new Prisma.Decimal(paidAmount),
          balanceDue: new Prisma.Decimal(Math.max(0, balanceDue)),
          status: newStatus,
        },
      });

      if (cashBankId && arId) {
        const entryDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
        const desc = `Payment received for ${invoice.invoiceNumber ?? `Invoice #${dto.invoiceId}`}`;
        await tx.ledgerEntry.createMany({
          data: [
            {
              organizationId,
              accountId: cashBankId,
              entryDate,
              description: desc,
              debit: new Prisma.Decimal(dto.amount),
              credit: 0,
              referenceType: "Payment",
              referenceId: payment.id,
            },
            {
              organizationId,
              accountId: arId,
              entryDate,
              description: desc,
              debit: 0,
              credit: new Prisma.Decimal(dto.amount),
              referenceType: "Payment",
              referenceId: payment.id,
            },
          ],
        });
      }

      return payment;
    });
  }

  async refund(id: number, organizationId: number) {
    const { cashBankId, arId } = await this.getAccountIds(organizationId);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, organizationId },
      });
      if (!payment) throw new NotFoundException("Payment not found");
      if (payment.status === "refunded") {
        throw new BadRequestException("Payment already refunded");
      }

      await tx.payment.update({
        where: { id },
        data: { status: "refunded" },
      });

      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
        });
        if (invoice) {
          const paidAmount = Number(invoice.paidAmount) - Number(payment.amount);
          const newPaidAmount = Math.max(0, paidAmount);
          const balanceDue = Number(invoice.total) - newPaidAmount;

          let newStatus = invoice.status;
          if (newPaidAmount <= 0) {
            newStatus = "sent";
          } else {
            newStatus = "partially_paid";
          }

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: new Prisma.Decimal(newPaidAmount),
              balanceDue: new Prisma.Decimal(balanceDue),
              status: newStatus,
            },
          });
        }
      }

      if (cashBankId && arId) {
        const entryDate = payment.paymentDate ?? new Date();
        const desc = `Payment refunded — ${payment.referenceId ?? `Payment #${id}`}`;
        await tx.ledgerEntry.createMany({
          data: [
            {
              organizationId,
              accountId: cashBankId,
              entryDate,
              description: desc,
              debit: 0,
              credit: new Prisma.Decimal(Number(payment.amount)),
              referenceType: "Refund",
              referenceId: id,
            },
            {
              organizationId,
              accountId: arId,
              entryDate,
              description: desc,
              debit: new Prisma.Decimal(Number(payment.amount)),
              credit: 0,
              referenceType: "Refund",
              referenceId: id,
            },
          ],
        });
      }

      return { message: "Payment refunded successfully" };
    });
  }

  async getMetrics(organizationId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayPayments, monthPayments, outstanding, refunds, failed] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            status: "completed",
            paymentDate: { gte: today },
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            status: "completed",
            paymentDate: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            organizationId,
            status: { in: ["sent", "overdue"] },
          },
          _sum: { balanceDue: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            status: "refunded",
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.count({
          where: {
            organizationId,
            status: "failed",
          },
        }),
      ]);

    return {
      today: Number(todayPayments._sum.amount ?? 0),
      thisMonth: Number(monthPayments._sum.amount ?? 0),
      outstanding: Number(outstanding._sum.balanceDue ?? 0),
      refunds: Number(refunds._sum.amount ?? 0),
      failed,
    };
  }
}
