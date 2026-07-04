import api from "./api";

const authService = {
  login: (email: any, password: any): Promise<any> => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    return api.post("/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (email: any, password: any): Promise<any> => api.post("/users/", { email, password }),
};

export default authService;
