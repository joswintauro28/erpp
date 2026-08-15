export interface ApiProduct {
  id: number;
  organization_id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  description: string | null;
  unit: string;
  price: number;
  cost_price: number;
  tax_rate: number;
  track_inventory: boolean;
  low_stock_threshold: number;
  uses_batch_tracking: boolean;
  uses_serial_tracking: boolean;
  costing_method: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiWarehouse {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiSupplier {
  id: number;
  organization_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gst_number: string | null;
  contact_person: string | null;
  payment_terms: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiStockMovement {
  id: number;
  organization_id: number;
  product_id: number;
  warehouse_id: number;
  type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface ApiPurchaseOrder {
  id: number;
  organization_id: number;
  supplier_id: number;
  warehouse_id: number;
  order_number: string;
  status: string;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  ordered_at: string | null;
  expected_at: string | null;
  received_at: string | null;
  items: ApiPurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface ApiPurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ApiSerialNumber {
  id: number;
  organization_id: number;
  product_id: number;
  warehouse_id: number;
  serial_number: string;
  status: string;
  purchase_order_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiStockLevel {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reserved_quantity: number;
  product_name?: string;
  sku?: string;
  warehouse_name?: string;
}

export interface ApiFulfillmentItem {
  id: number;
  fulfillment_id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  ordered_quantity: number;
  reserved_quantity: number;
  picked_quantity: number;
  packed_quantity: number;
  unit_price: number;
}

export interface ApiFulfillment {
  id: number;
  organization_id: number;
  sales_order_code: string;
  customer_name: string;
  warehouse_id: number | null;
  status: string;
  shipping_carrier: string | null;
  tracking_number: string | null;
  dispatched_at: string | null;
  batch_no: string | null;
  purchase_order_id: number | null;
  invoice_id: number | null;
  created_at: string;
  updated_at: string;
  items: ApiFulfillmentItem[];
}
