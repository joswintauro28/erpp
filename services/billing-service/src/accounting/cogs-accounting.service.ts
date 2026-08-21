import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";

export interface CostSnapshotData {
  product_id: number;
  sku?: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  costing_method: string;
  warehouse_id?: number;
  warehouse_name?: string;
  batch_number?: string;
  serial_number?: string;
  inventory_transaction_id?: number;
  cost_calculation_timestamp: string;
  cost_version: string;
  inventory_movement_reference?: string;
  cost_layers?: any[];
  snapshot_hash?: string;
  signature?: string;
}

const SECRET_KEY = process.env.COGS_SECRET_KEY || "datavox-cogs-secret-key";

@Injectable()
export class CogsAccountingService {
  private readonly logger = new Logger(CogsAccountingService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateHash(snapshot: CostSnapshotData): string {
    const raw = `${snapshot.product_id}:${snapshot.quantity}:${snapshot.unit_cost}:${snapshot.cost_calculation_timestamp}:${snapshot.cost_version}:${snapshot.inventory_movement_reference || ""}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  calculateSignature(hash: string): string {
    return crypto.createHmac("sha256", SECRET_KEY).update(hash).digest("hex");
  }

  async resolveAccount(organizationId: number, role: string): Promise<number> {
    const mapping = await this.prisma.accountMapping.findUnique({
      where: {
        organizationId_role: { organizationId, role },
      },
    });

    if (mapping) return mapping.accountId;

    // Fallback default code mapping
    const defaultCodes: Record<string, { code: string; name: string; type: any }> = {
      ROLE_COGS: { code: "5000", name: "Cost of Goods Sold", type: "Expense" },
      ROLE_INVENTORY_ASSET: { code: "1003", name: "Inventory Asset", type: "Asset" },
      ROLE_ACCOUNTS_RECEIVABLE: { code: "1002", name: "Accounts Receivable", type: "Asset" },
      ROLE_SALES_REVENUE: { code: "4001", name: "Sales Revenue", type: "Revenue" },
      ROLE_SALES_RETURNS: { code: "4002", name: "Sales Returns & Allowances", type: "Revenue" },
    };

    const target = defaultCodes[role] || { code: "5000", name: "COGS Default", type: "Expense" };

    let account = await this.prisma.account.findFirst({
      where: { organizationId, code: target.code },
    });

    if (!account) {
      account = await this.prisma.account.create({
        data: {
          organizationId,
          code: target.code,
          name: target.name,
          type: target.type,
          subType: "Operating",
          balance: new Prisma.Decimal(0),
        },
      });
    }

    await this.prisma.accountMapping.upsert({
      where: { organizationId_role: { organizationId, role } },
      create: { organizationId, role, accountId: account.id },
      update: { accountId: account.id },
    });

    return account.id;
  }

  async processShipmentDispatched(
    organizationId: number,
    idempotencyKey: string,
    payload: {
      shipmentReference: string;
      invoiceId?: number;
      warehouseId?: number;
      items: CostSnapshotData[];
      performedBy?: string;
    },
  ): Promise<any> {
    this.logger.log(`Processing Shipment.Dispatched event: ${idempotencyKey}`);

    // Check Inbox deduplication
    const existingInbox = await this.prisma.inboxRecord.findUnique({
      where: { idempotencyKey },
    });

    if (existingInbox && existingInbox.processingStatus === "COMPLETED") {
      this.logger.warn(`Event ${idempotencyKey} already processed. Skipping duplicate.`);
      return { status: "SKIPPED_DUPLICATE", idempotencyKey };
    }

    const inbox = await this.prisma.inboxRecord.upsert({
      where: { idempotencyKey },
      create: {
        organizationId,
        idempotencyKey,
        eventType: "Shipment.Dispatched",
        payload: payload as any,
        processingStatus: "PROCESSING",
      },
      update: { processingStatus: "PROCESSING" },
    });

    return this.prisma.$transaction(async (tx) => {
      let totalCogs = 0;
      const snapshots: CostSnapshotData[] = [];

      for (const item of payload.items) {
        const itemCost = item.total_cost || item.unit_cost * item.quantity;
        totalCogs += itemCost;

        const hash = this.calculateHash(item);
        const sig = this.calculateSignature(hash);

        snapshots.push({
          ...item,
          total_cost: itemCost,
          snapshot_hash: hash,
          signature: sig,
        });
      }

      const cogsAccountId = await this.resolveAccount(organizationId, "ROLE_COGS");
      const inventoryAccountId = await this.resolveAccount(organizationId, "ROLE_INVENTORY_ASSET");

      const overallHash = this.calculateHash(snapshots[0] || ({ product_id: 0, quantity: 1, unit_cost: totalCogs, cost_calculation_timestamp: new Date().toISOString(), cost_version: "v1.0" } as any));
      const overallSig = this.calculateSignature(overallHash);

      const posting = await tx.cogsPosting.create({
        data: {
          organizationId,
          idempotencyKey,
          invoiceId: payload.invoiceId,
          shipmentReference: payload.shipmentReference,
          status: "Posted",
          totalCost: new Prisma.Decimal(totalCogs),
          warehouseId: payload.warehouseId,
          snapshotData: snapshots as any,
          snapshotHash: overallHash,
          signature: overallSig,
        },
      });

      const entryDate = new Date();
      const desc = `COGS Recognition for Shipment ${payload.shipmentReference}${payload.invoiceId ? ` (Invoice #${payload.invoiceId})` : ""}`;

      // Double Entry: DR COGS Expense (5000), CR Inventory Asset (1003)
      await tx.ledgerEntry.createMany({
        data: [
          {
            organizationId,
            accountId: cogsAccountId,
            entryDate,
            description: desc,
            debit: new Prisma.Decimal(totalCogs),
            credit: new Prisma.Decimal(0),
            referenceType: "Shipment",
            referenceId: posting.id,
          },
          {
            organizationId,
            accountId: inventoryAccountId,
            entryDate,
            description: desc,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(totalCogs),
            referenceType: "Shipment",
            referenceId: posting.id,
          },
        ],
      });

      // Update account balances
      await tx.account.update({
        where: { id: cogsAccountId },
        data: { balance: { increment: new Prisma.Decimal(totalCogs) } },
      });

      await tx.account.update({
        where: { id: inventoryAccountId },
        data: { balance: { decrement: new Prisma.Decimal(totalCogs) } },
      });

      // Audit Log
      await tx.cogsAuditLog.create({
        data: {
          organizationId,
          postingId: posting.id,
          action: "COGS_POSTED",
          details: `Recognized COGS of $${totalCogs.toFixed(2)} across ${payload.items.length} item line(s) for shipment ${payload.shipmentReference}`,
          performedBy: payload.performedBy || "system:event-bus",
        },
      });

      // Update Inbox status
      await tx.inboxRecord.update({
        where: { id: inbox.id },
        data: { processingStatus: "COMPLETED", processedAt: new Date() },
      });

      return posting;
    });
  }

  async reverseCogsPosting(
    organizationId: number,
    postingId: number,
    reason: string,
    performedBy = "system",
  ): Promise<any> {
    const posting = await this.prisma.cogsPosting.findFirst({
      where: { id: postingId, organizationId },
    });

    if (!posting) throw new NotFoundException("COGS Posting record not found");
    if (posting.status === "Reversed") {
      throw new BadRequestException("Posting has already been reversed");
    }

    const totalCost = Number(posting.totalCost);

    return this.prisma.$transaction(async (tx) => {
      const cogsAccountId = await this.resolveAccount(organizationId, "ROLE_COGS");
      const inventoryAccountId = await this.resolveAccount(organizationId, "ROLE_INVENTORY_ASSET");

      const entryDate = new Date();
      const desc = `Reversal of COGS Posting #${posting.id} — Reason: ${reason}`;

      // Reversing Double Entry: DR Inventory Asset (1003), CR COGS Expense (5000)
      await tx.ledgerEntry.createMany({
        data: [
          {
            organizationId,
            accountId: inventoryAccountId,
            entryDate,
            description: desc,
            debit: new Prisma.Decimal(totalCost),
            credit: new Prisma.Decimal(0),
            referenceType: "CogsReversal",
            referenceId: posting.id,
          },
          {
            organizationId,
            accountId: cogsAccountId,
            entryDate,
            description: desc,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(totalCost),
            referenceType: "CogsReversal",
            referenceId: posting.id,
          },
        ],
      });

      await tx.account.update({
        where: { id: inventoryAccountId },
        data: { balance: { increment: new Prisma.Decimal(totalCost) } },
      });

      await tx.account.update({
        where: { id: cogsAccountId },
        data: { balance: { decrement: new Prisma.Decimal(totalCost) } },
      });

      const updated = await tx.cogsPosting.update({
        where: { id: postingId },
        data: { status: "Reversed" },
      });

      await tx.cogsAuditLog.create({
        data: {
          organizationId,
          postingId,
          action: "COGS_REVERSED",
          details: `Reversed COGS posting #${postingId} ($${totalCost.toFixed(2)}). Reason: ${reason}`,
          performedBy,
        },
      });

      return updated;
    });
  }

  async verifyPostingIntegrity(organizationId: number, postingId: number): Promise<any> {
    const posting = await this.prisma.cogsPosting.findFirst({
      where: { id: postingId, organizationId },
    });
    if (!posting) throw new NotFoundException("Posting not found");

    const snapshots = posting.snapshotData as any as CostSnapshotData[];
    const firstSnap = Array.isArray(snapshots) ? snapshots[0] : (snapshots as any);
    if (!firstSnap) return { valid: false, reason: "No snapshot data" };

    const expectedHash = this.calculateHash(firstSnap);
    const expectedSig = this.calculateSignature(expectedHash);

    const isHashValid = posting.snapshotHash === expectedHash;
    const isSigValid = posting.signature === expectedSig;

    return {
      postingId: posting.id,
      isValid: isHashValid && isSigValid,
      recordedHash: posting.snapshotHash,
      calculatedHash: expectedHash,
      signatureMatch: isSigValid,
      timestamp: new Date().toISOString(),
    };
  }
}
