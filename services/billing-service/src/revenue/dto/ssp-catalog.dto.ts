export class CreateSspCatalogEntryDto {
  productId!: number;
  productName!: string;
  sspType!: "FIXED" | "PRICE_LIST" | "REGIONAL" | "VERSIONED" | "PROMOTIONAL";
  basePrice!: number;
  region?: string;
  priceListTier?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  version?: number;
}

export class UpdateSspCatalogEntryDto {
  basePrice?: number;
  region?: string;
  priceListTier?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  version?: number;
}

export interface SspCatalogEntryResponse {
  id: number;
  productId: number;
  productName: string;
  sspType: string;
  basePrice: number;
  region: string | null;
  priceListTier: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  version: number;
  isActive: boolean;
}
