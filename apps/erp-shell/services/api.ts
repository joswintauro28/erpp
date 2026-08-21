import { setAccessToken, getAccessToken, api as baseApi } from "@datavex/auth-middleware";

export { setAccessToken, getAccessToken };

const CRM_PATHS = [
  "customers", "contacts", "documents", "opportunities", "sales", "sales-orders",
  "requirements", "quotations", "reports", "ai-assistant", "lead-discovery", "leads"
];

function normalizePath(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (CRM_PATHS.some(p => cleanPath.startsWith(p)) && !cleanPath.startsWith("crm/")) {
    return `/crm/${cleanPath}`;
  }
  return path;
}

function mapQuotationFields(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(mapQuotationFields);
  }
  if (typeof data === "object") {
    if (data.quotations && Array.isArray(data.quotations)) {
      return {
        ...data,
        quotations: data.quotations.map(mapQuotationFields),
      };
    }
    const mapped: any = { ...data };
    if ("quote_number" in mapped) {
      mapped["quote_no"] = mapped["quote_number"];
    }
    if ("client_name" in mapped) {
      mapped["account"] = mapped["client_name"];
    }
    if ("total" in mapped) {
      mapped["value"] = String(mapped["total"]);
    }
    if ("status" in mapped && typeof mapped["status"] === "string") {
      const s = mapped["status"].toLowerCase();
      if (s === "accepted") mapped["status"] = "Accepted";
      else if (s === "draft") mapped["status"] = "Draft";
      else if (s === "sent") mapped["status"] = "Sent";
      else if (s === "rejected") mapped["status"] = "Rejected";
      else if (s === "expired") mapped["status"] = "Expired";
      
      if (mapped["converted_invoice_id"]) {
        mapped["status"] = "Converted";
      }
    }
    Object.keys(mapped).forEach(key => {
      if (mapped[key] && typeof mapped[key] === "object") {
        mapped[key] = mapQuotationFields(mapped[key]);
      }
    });
    return mapped;
  }
  return data;
}

export const api = {
  get: async <T>(path: string, opts?: any): Promise<T> => {
    const res = await baseApi.get<any>(normalizePath(path), opts);
    return mapQuotationFields(res);
  },
  post: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    const res = await baseApi.post<any>(normalizePath(path), body, opts);
    return mapQuotationFields(res);
  },
  put: async <T>(path: string, body?: any): Promise<T> => {
    const res = await baseApi.put<any>(normalizePath(path), body);
    return mapQuotationFields(res);
  },
  patch: async <T>(path: string, body?: any): Promise<T> => {
    const res = await baseApi.patch<any>(normalizePath(path), body);
    return mapQuotationFields(res);
  },
  delete: async <T>(path: string): Promise<T> => {
    const res = await baseApi.delete<any>(normalizePath(path));
    return mapQuotationFields(res);
  },
};
