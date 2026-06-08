import axios, { AxiosResponse } from "axios";
import { Series, SeriesStats, FilterState, MetadataItem } from "../types";
import type { CreateSeriesInput, UpdateSeriesInput } from "../../../backend/src/utils/validation";

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
  
  create: (data: CreateSeriesInput): Promise<AxiosResponse<Series>> => 
    axios.post(`${API_BASE}/series`, data),
  
  update: (id: string, data: UpdateSeriesInput): Promise<AxiosResponse<Series>> => 
    axios.patch(`${API_BASE}/series/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<{ success: boolean }>> => 
    axios.delete(`${API_BASE}/series/${id}`),
};
