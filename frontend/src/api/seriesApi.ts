import axios, { AxiosResponse } from "axios";
import { Series, SeriesStats, FilterState, MetadataItem } from "../types";

const API_BASE = "/api";

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
