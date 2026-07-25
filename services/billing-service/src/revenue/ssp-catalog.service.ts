import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateSspCatalogEntryDto, UpdateSspCatalogEntryDto, SspCatalogEntryResponse } from "./dto/ssp-catalog.dto";

@Injectable()
export class SspCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: number, dto: CreateSspCatalogEntryDto): Promise<SspCatalogEntryResponse> {
    const entry = await this.prisma.sspCatalog.create({
      data: {
        organizationId,
        productId: dto.productId,
        productName: dto.productName,
        sspType: dto.sspType,
        basePrice: new Prisma.Decimal(dto.basePrice),
        region: dto.region ?? null,
        priceListTier: dto.priceListTier ?? null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        version: dto.version ?? 1,
      },
    });
    return this.toResponse(entry);
  }

  async findAll(
    organizationId: number,
    productId?: number,
    onlyActive?: boolean,
  ): Promise<SspCatalogEntryResponse[]> {
    const where: Prisma.SspCatalogWhereInput = { organizationId };
    if (productId !== undefined) where.productId = productId;
    if (onlyActive) where.isActive = true;

    const entries = await this.prisma.sspCatalog.findMany({
      where,
      orderBy: [{ productId: "asc" }, { version: "desc" }],
    });
    return entries.map(this.toResponse);
  }

  async findActiveSsp(
    organizationId: number,
    productId: number,
    referenceDate: Date = new Date(),
  ): Promise<SspCatalogEntryResponse | null> {
    const entry = await this.prisma.sspCatalog.findFirst({
      where: {
        organizationId,
        productId,
        isActive: true,
        OR: [
          { effectiveFrom: null, effectiveTo: null },
          { effectiveFrom: null, effectiveTo: { gte: referenceDate } },
          { effectiveFrom: { lte: referenceDate }, effectiveTo: null },
          { effectiveFrom: { lte: referenceDate }, effectiveTo: { gte: referenceDate } },
        ],
      },
      orderBy: { version: "desc" },
    });
    return entry ? this.toResponse(entry) : null;
  }

  async update(
    id: number,
    organizationId: number,
    dto: UpdateSspCatalogEntryDto,
  ): Promise<SspCatalogEntryResponse> {
    const existing = await this.prisma.sspCatalog.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("SSP catalog entry not found");

    const data: Prisma.SspCatalogUpdateInput = {};
    if (dto.basePrice !== undefined) data.basePrice = new Prisma.Decimal(dto.basePrice);
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.priceListTier !== undefined) data.priceListTier = dto.priceListTier;
    if (dto.effectiveFrom !== undefined) data.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    if (dto.effectiveTo !== undefined) data.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.version !== undefined) data.version = dto.version;

    const updated = await this.prisma.sspCatalog.update({ where: { id }, data });
    return this.toResponse(updated);
  }

  async remove(id: number, organizationId: number): Promise<void> {
    const existing = await this.prisma.sspCatalog.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("SSP catalog entry not found");
    await this.prisma.sspCatalog.delete({ where: { id } });
  }

  private toResponse(entry: any): SspCatalogEntryResponse {
    return {
      id: entry.id,
      productId: entry.productId,
      productName: entry.productName,
      sspType: entry.sspType,
      basePrice: Number(entry.basePrice),
      region: entry.region,
      priceListTier: entry.priceListTier,
      effectiveFrom: entry.effectiveFrom?.toISOString() ?? null,
      effectiveTo: entry.effectiveTo?.toISOString() ?? null,
      version: entry.version,
      isActive: entry.isActive,
    };
  }
}
