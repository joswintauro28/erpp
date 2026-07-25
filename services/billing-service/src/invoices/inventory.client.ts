import { Injectable, Logger } from "@nestjs/common";

interface BatchCostItem {
  product_id: number;
  quantity?: number;
  warehouse_id?: number;
  batch_number?: string;
  serial_number?: string;
}

@Injectable()
export class InventoryClientService {
  private readonly logger = new Logger(InventoryClientService.name);
  private readonly inventoryUrl =
    process.env.INVENTORY_SERVICE_URL || "http://localhost:8004";

  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly TTL_MS = 30000; // 30s TTL cache for draft estimations

  async getBatchCosts(
    organizationId: number,
    items: BatchCostItem[],
  ): Promise<any> {
    if (!items.length) return { costs: [] };

    const cacheKey = `${organizationId}:${JSON.stringify(items)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const resp = await fetch(`${this.inventoryUrl}/products/costs/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": String(organizationId),
        },
        body: JSON.stringify({ items }),
      });

      if (!resp.ok) {
        this.logger.warn(`Failed to fetch batch costs from inventory service: ${resp.status}`);
        return { costs: [] };
      }

      const data = await resp.json();
      this.cache.set(cacheKey, { data, expiresAt: Date.now() + this.TTL_MS });
      return data;
    } catch (err: any) {
      this.logger.error(`Error fetching batch costs from inventory-service: ${err.message}`);
      return { costs: [] };
    }
  }

  async getProductCost(
    organizationId: number,
    productId: number,
    quantity = 1,
  ): Promise<any> {
    try {
      const resp = await fetch(
        `${this.inventoryUrl}/products/${productId}/cost?quantity=${quantity}`,
        {
          headers: {
            "x-organization-id": String(organizationId),
          },
        },
      );

      if (!resp.ok) return null;
      return await resp.json();
    } catch (err: any) {
      this.logger.error(`Error fetching product cost for ${productId}: ${err.message}`);
      return null;
    }
  }
}
