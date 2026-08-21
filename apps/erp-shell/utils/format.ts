import type { Lead, Client } from "@/types/crm";
export { money, lakhFormat, invoiceStatusVariant, quotationStatusVariant, formatDate, noteStatusVariant, statusVariant } from "@/lib/utils";

export const number = (v: number | null | undefined): string => {
  if (v === null || v === undefined || isNaN(v)) return "0";
  return v.toLocaleString("en-IN");
};

export function searchBilling<T extends { client_name: string; invoice_number?: string }>(
  items: T[], query: string
): T[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.client_name.toLowerCase().includes(q) ||
      (item.invoice_number && item.invoice_number.toLowerCase().includes(q))
  );
}

export function searchLeads(leads: Lead[], query: string): Lead[] {
  if (!query.trim()) return leads;
  const q = query.toLowerCase();
  return leads.filter(
    (l) =>
      l.company_name.toLowerCase().includes(q) ||
      (l.contact_person ?? "").toLowerCase().includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q)
  );
}

export function searchClients(clients: Client[], query: string): Client[] {
  if (!query.trim()) return clients;
  const q = query.toLowerCase();
  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.gst_number.toLowerCase().includes(q)
  );
}
