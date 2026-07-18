import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSalesInvoice(payload: any) {
    const organizationId = payload.organizationId ?? 1;
    const gstTreatment = payload.gstTreatment ?? "intrastate";

    let subtotal = 0;
    let cgst = 0, sgst = 0, igst = 0;

    const itemsData = (payload.items ?? []).map((item: any) => {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const gstRate = Number(item.gstRate ?? 0);
      const amount = qty * unitPrice;
      subtotal += amount;

      if (gstTreatment === "interstate") {
        igst += amount * gstRate / 100;
      } else {
        const half = amount * gstRate / 200;
        cgst += half;
        sgst += half;
      }

      return {
        productId: item.productId ?? null,
        description: item.description,
        quantity: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(unitPrice),
        costPrice: new Prisma.Decimal(item.costPrice ?? 0),
        gstRate: new Prisma.Decimal(gstRate),
        amount: new Prisma.Decimal(amount),
      };
    });

    const discount = Number(payload.discount ?? 0);
    const taxableValue = subtotal - discount;
    const taxTotal = cgst + sgst + igst;
    const total = taxableValue + taxTotal;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          type: "receivable",
          clientId: payload.clientId,
          clientName: payload.clientName,
          gstTreatment,
          placeOfSupply: payload.placeOfSupply ?? null,
          issueDate: payload.issueDate ? new Date(payload.issueDate) : new Date(),
          dueDate: payload.dueDate ? new Date(payload.dueDate) : new Date(Date.now() + 30 * 86400000),
          notes: payload.orderReference
            ? `Auto-generated from sales order: ${payload.orderReference}`
            : "Auto-generated from sales order",
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(discount),
          discountType: payload.discountType ?? null,
          cgst: new Prisma.Decimal(cgst),
          sgst: new Prisma.Decimal(sgst),
          igst: new Prisma.Decimal(igst),
          taxTotal: new Prisma.Decimal(taxTotal),
          total: new Prisma.Decimal(total),
          balanceDue: new Prisma.Decimal(total),
          status: "draft",
          items: { create: itemsData },
        },
        include: { items: true, payments: true },
      });

      this.logger.log(`Sales invoice #${invoice.id} created from internal webhook`);
      return invoice;
    });
  }

  async createVendorBill(payload: any) {
    const organizationId = payload.organizationId ?? 1;
    const gstTreatment = payload.gstTreatment ?? "intrastate";

    let subtotal = 0;
    let cgst = 0, sgst = 0, igst = 0;

    const itemsData = (payload.items ?? []).map((item: any) => {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const gstRate = Number(item.gstRate ?? 0);
      const amount = qty * unitPrice;
      subtotal += amount;

      if (gstTreatment === "interstate") {
        igst += amount * gstRate / 100;
      } else {
        const half = amount * gstRate / 200;
        cgst += half;
        sgst += half;
      }

      return {
        productId: item.productId ?? null,
        description: item.description,
        quantity: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(unitPrice),
        costPrice: new Prisma.Decimal(0),
        gstRate: new Prisma.Decimal(gstRate),
        amount: new Prisma.Decimal(amount),
      };
    });

    const discount = Number(payload.discount ?? 0);
    const taxableValue = subtotal - discount;
    const taxTotal = cgst + sgst + igst;
    const total = taxableValue + taxTotal;

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.invoice.create({
        data: {
          organizationId,
          type: "payable",
          vendorId: payload.vendorId,
          vendorName: payload.vendorName,
          gstTreatment,
          placeOfSupply: payload.placeOfSupply ?? null,
          issueDate: payload.billDate ? new Date(payload.billDate) : new Date(),
          dueDate: payload.dueDate ? new Date(payload.dueDate) : new Date(Date.now() + 30 * 86400000),
          notes: payload.poReference
            ? `Auto-generated from purchase order: ${payload.poReference}`
            : "Auto-generated from purchase order",
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(discount),
          discountType: payload.discountType ?? null,
          cgst: new Prisma.Decimal(cgst),
          sgst: new Prisma.Decimal(sgst),
          igst: new Prisma.Decimal(igst),
          taxTotal: new Prisma.Decimal(taxTotal),
          total: new Prisma.Decimal(total),
          balanceDue: new Prisma.Decimal(total),
          status: "draft",
          items: { create: itemsData },
        },
        include: { items: true, payments: true },
      });

      this.logger.log(`Vendor bill #${bill.id} created from internal webhook`);
      return bill;
    });
  }
}
