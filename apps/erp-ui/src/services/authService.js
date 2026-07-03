import api from "./api";

const authService = {
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    return api.post("/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (email, password) => api.post("/users/", { email, password }),
};

export default authService;
