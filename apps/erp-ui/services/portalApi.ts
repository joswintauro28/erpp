import axios, { InternalAxiosRequestConfig } from "axios";

const portalApi = axios.create({
  baseURL: "http://localhost:8000/portal",
});

portalApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("portal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("portal_token");
      window.location.href = "/portal/login";
    }
    return Promise.reject(error);
  }
);

// ── Public Auth ──
export const portalAuth = {
  login: (email: string, password: string): Promise<any> =>
    portalApi.post("/login", { email, password }),
  validateInvitation: (token: string): Promise<any> =>
    portalApi.get(`/invitation/validate?token=${encodeURIComponent(token)}`),
  acceptInvitation: (token: string, password: string, full_name: string): Promise<any> =>
    portalApi.post("/invitation/accept", { token, password, full_name }),
};

// ── Dashboard ──
export const portalDashboard = {
  get: (): Promise<any> => portalApi.get("/dashboard"),
};

// ── Invoices ──
export const portalInvoices = {
  getAll: (): Promise<any> => portalApi.get("/invoices"),
  getById: (id: number): Promise<any> => portalApi.get(`/invoices/${id}`),
  getPdf: (id: number): Promise<any> => portalApi.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
  pay: (id: number): Promise<any> => portalApi.post(`/invoices/${id}/pay`),
};

// ── Quotations ──
export const portalQuotations = {
  getAll: (): Promise<any> => portalApi.get("/quotations"),
  getPdf: (id: number): Promise<any> => portalApi.get(`/quotations/${id}/pdf`, { responseType: "blob" }),
  accept: (id: number): Promise<any> => portalApi.post(`/quotations/${id}/accept`),
  reject: (id: number): Promise<any> => portalApi.post(`/quotations/${id}/reject`),
};

// ── Payments ──
export const portalPayments = {
  getAll: (): Promise<any> => portalApi.get("/payments"),
};

// ── Profile ──
export const portalProfile = {
  get: (): Promise<any> => portalApi.get("/profile"),
  updatePassword: (current_password: string, new_password: string): Promise<any> =>
    portalApi.put("/profile/password", { current_password, new_password }),
};

export default portalApi;
