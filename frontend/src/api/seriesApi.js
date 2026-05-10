import axios from "axios";

const API_BASE = "/api";

export const seriesApi = {
  getAll: (filters) => axios.get(`${API_BASE}/series`, { params: filters }),
  getStats: () => axios.get(`${API_BASE}/series/stats`),
  getAuthors: () => axios.get(`${API_BASE}/authors`),
  getPublishers: () => axios.get(`${API_BASE}/publishers`),
  create: (data) => axios.post(`${API_BASE}/series`, data),
  update: (id, data) => axios.patch(`${API_BASE}/series/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE}/series/${id}`),
};
