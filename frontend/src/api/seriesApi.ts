import axios, { AxiosResponse } from "axios";
import { Series, SeriesStats, FilterState, MetadataItem } from "../types";

const API_BASE = "/api";

// The server lists what it rejected per field; surface the first one instead of a bare "failed".
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const data = axios.isAxiosError(err)
    ? (err.response?.data as { error?: string; details?: { path: string; message: string }[] } | undefined)
    : undefined;
  const detail = data?.details?.[0];
  if (detail) return `${fallback}: ${detail.message} (${detail.path})`;
  return data?.error ? `${fallback}: ${data.error}` : fallback;
};

// Remote covers go through the backend cache so they keep working offline once seen
export const coverSrc = (url: string): string =>
  /^https?:\/\//i.test(url) ? `${API_BASE}/cover?url=${encodeURIComponent(url)}` : url;

export interface ApiResponse<T> {
  data: T;
  success?: boolean;
}

export const seriesApi = {
  getAll: (filters?: Partial<FilterState>): Promise<AxiosResponse<ApiResponse<Series[]>>> => 
    axios.get(`${API_BASE}/series`, { params: filters }),
  
  getStats: (): Promise<AxiosResponse<SeriesStats>> => 
    axios.get(`${API_BASE}/series/stats`),
  
  getAuthors: (): Promise<AxiosResponse<MetadataItem[]>> => 
    axios.get(`${API_BASE}/authors`),
  
  getPublishers: (): Promise<AxiosResponse<MetadataItem[]>> => 
    axios.get(`${API_BASE}/publishers`),
  
  create: (data: Partial<Series>): Promise<AxiosResponse<Series>> =>
    axios.post(`${API_BASE}/series`, data),

  update: (id: string, data: Partial<Series>): Promise<AxiosResponse<Series>> =>
    axios.patch(`${API_BASE}/series/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<{ success: boolean }>> => 
    axios.delete(`${API_BASE}/series/${id}`),
};
