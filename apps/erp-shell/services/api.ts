import { setAccessToken, getAccessToken, API_BASE, api as baseApi } from "@datavex/auth-middleware";

export { setAccessToken, getAccessToken, API_BASE };

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
    const res = await baseApi.get<any>(path, opts);
    return mapQuotationFields(res);
  },
  post: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    const res = await baseApi.post<any>(path, body, opts);
    return mapQuotationFields(res);
  },
  put: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    const res = await baseApi.put<any>(path, body, opts);
    return mapQuotationFields(res);
  },
  patch: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    const res = await baseApi.patch<any>(path, body, opts);
    return mapQuotationFields(res);
  },
  delete: async <T>(path: string, opts?: any): Promise<T> => {
    const res = await baseApi.delete<any>(path, opts);
    return mapQuotationFields(res);
  },
};
