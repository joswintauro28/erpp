export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
  cost: number;
  reorder_level: number;
  hsn: string;
  is_active: boolean;
}

export interface StockMovement {
  id: number;
  date: string;
  product_id: number;
  product_name: string;
  sku: string;
  movement_type: "In" | "Out";
  quantity: number;
  reference_type: string;
  reference: string;
  warehouse: string;
  notes: string;
}

export interface StockAdjustment {
  id: number;
  date: string;
  product_id: number;
  product_name: string;
  sku: string;
  adjustment_type: "Addition" | "Reduction";
  quantity: number;
  reason: string;
  warehouse: string;
  reference: string;
  status: "draft" | "approved" | "rejected";
}

export interface ValuationRow {
  product_name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  used: number;
  is_active: boolean;
  manager: string;
  contact: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  order_date: string;
  expected_date: string;
  total: number;
  status: "draft" | "sent" | "confirmed" | "received" | "cancelled";
  items: { product: string; sku: string; quantity: number; unit_price: number; total: number }[];
  notes: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  gst_number: string;
  state: string;
  address: string;
  payment_terms: string;
  supply_categories: string[];
  is_active: boolean;
}

export interface Batch {
  id: number;
  batch_number: string;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  mfg_date: string;
  expiry_date: string;
  warehouse: string;
}

export interface SerialItem {
  id: number;
  serial_number: string;
  product_id: number;
  product_name: string;
  sku: string;
  status: "in_stock" | "sold" | "returned" | "warranty" | "scrapped";
  warehouse: string;
  sold_date: string;
  warranty_until: string;
  customer: string;
}

export interface ApiProduct {
  id: number; name: string; sku: string | null; category: string | null;
  price: number; cost_price: number; stock: number;
  low_stock_threshold: number; track_inventory: boolean;
}

export interface ProductView {
  id: number; name: string; sku: string; category: string;
  price: number; cost: number; stock: number;
  unit: string; reorder_level: number; hsn: string; is_active: boolean;
}
