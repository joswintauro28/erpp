import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const portalApi = axios.create({
  baseURL: `${API_URL}/portal`,
});

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("portal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("portal_token");
      window.location.href = "/portal/login";
    }
    return Promise.reject(error);
  }
);

export default portalApi;
