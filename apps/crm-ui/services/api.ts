import { setAccessToken, getAccessToken, API_BASE, api as baseApi } from "@datavex/auth-middleware";
import { toastError, errorMessage } from "@/utils/toast";

export { setAccessToken, getAccessToken, API_BASE };

/**
 * Global network-failure notifications (Phase 5). Every REST call funnels
 * through here; failures raise a toast unless explicitly silenced with
 * `{ toast: false }`. 401s are handled by the shared middleware before
 * reaching this point, so we only surface real failures (5xx, timeouts,
 * validation errors) and the synchronous Billing credit-check result.
 */
function maybeToast(path: string, err: unknown, opts?: any) {
  if (opts?.toast === false) return;
  if (typeof err === "object" && err && (err as any).name === "AbortError") return;
  const message = errorMessage(err);
  toastError(`Request failed: ${path.split("?")[0]}`, message);
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
    try {
      const res = await baseApi.get<any>(path, opts);
      return mapQuotationFields(res);
    } catch (err) {
      maybeToast(path, err, opts);
      throw err;
    }
  },
  post: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    try {
      const res = await baseApi.post<any>(path, body, opts);
      return mapQuotationFields(res);
    } catch (err) {
      maybeToast(path, err, opts);
      throw err;
    }
  },
  put: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    try {
      const res = await baseApi.put<any>(path, body);
      return mapQuotationFields(res);
    } catch (err) {
      maybeToast(path, err, opts);
      throw err;
    }
  },
  patch: async <T>(path: string, body?: any, opts?: any): Promise<T> => {
    try {
      const res = await baseApi.patch<any>(path, body);
      return mapQuotationFields(res);
    } catch (err) {
      maybeToast(path, err, opts);
      throw err;
    }
  },
  delete: async <T>(path: string, opts?: any): Promise<T> => {
    try {
      const res = await baseApi.delete<any>(path);
      return mapQuotationFields(res);
    } catch (err) {
      maybeToast(path, err, opts);
      throw err;
    }
  },
};
