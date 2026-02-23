import { authClient } from './client'

// ── 通用分页响应类型 ──

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ── 类型定义 ──

export interface Provider {
  id: string
  name: string
  base_url: string | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ProviderCreateData {
  name: string
  api_key: string
  base_url?: string | null
  is_enabled?: boolean
}

export interface ProviderUpdateData {
  name?: string
  api_key?: string
  base_url?: string | null
  is_enabled?: boolean
}

export interface ProviderModel {
  id: string
  provider_id: string
  name: string
  display_name: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ModelCreateData {
  name: string
  display_name: string
  is_enabled?: boolean
}

export interface ModelUpdateData {
  name?: string
  display_name?: string
  is_enabled?: boolean
}

// ── Provider API ──

const BASE = '/provider-management'

export async function fetchProviders(
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<Provider>> {
  const { data } = await authClient.get<PaginatedResponse<Provider>>(`${BASE}/providers`, {
    params: { page, page_size: pageSize },
  })
  return data
}

export async function fetchProvider(id: string): Promise<Provider> {
  const { data } = await authClient.get<Provider>(`${BASE}/providers/${id}`)
  return data
}

export async function createProvider(payload: ProviderCreateData): Promise<Provider> {
  const { data } = await authClient.post<Provider>(`${BASE}/providers`, payload)
  return data
}

export async function updateProvider(id: string, payload: ProviderUpdateData): Promise<Provider> {
  const { data } = await authClient.put<Provider>(`${BASE}/providers/${id}`, payload)
  return data
}

export async function deleteProvider(id: string): Promise<void> {
  await authClient.delete(`${BASE}/providers/${id}`)
}

// ── Model API ──

export async function fetchModels(
  providerId: string,
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<ProviderModel>> {
  const { data } = await authClient.get<PaginatedResponse<ProviderModel>>(
    `${BASE}/providers/${providerId}/models`,
    { params: { page, page_size: pageSize } },
  )
  return data
}

export async function createModel(
  providerId: string,
  payload: ModelCreateData,
): Promise<ProviderModel> {
  const { data } = await authClient.post<ProviderModel>(
    `${BASE}/providers/${providerId}/models`,
    payload,
  )
  return data
}

export async function updateModel(
  modelId: string,
  payload: ModelUpdateData,
): Promise<ProviderModel> {
  const { data } = await authClient.put<ProviderModel>(`${BASE}/models/${modelId}`, payload)
  return data
}

export async function deleteModel(modelId: string): Promise<void> {
  await authClient.delete(`${BASE}/models/${modelId}`)
}
