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

export default portalApi;
