import api from "./api";

const searchService = {
  global: (q: string): Promise<any> => api.get(`/search/global?q=${encodeURIComponent(q)}`),
};

export default searchService;
