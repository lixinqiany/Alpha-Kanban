import type { PaginatedResponse } from './provider'
import { authClient } from './client'

// ── 类型定义 ──

export interface ProviderLink {
  provider_id: string
  provider_name: string
  is_enabled: boolean
}

export interface Model {
  id: string
  name: string
  display_name: string
  manufacturer: string
  is_enabled: boolean
  providers: ProviderLink[]
  created_at: string
  updated_at: string
}

export interface ModelCreateData {
  name: string
  display_name: string
  manufacturer: string
  is_enabled?: boolean
  provider_ids: string[]
}

export interface ModelUpdateData {
  name?: string
  display_name?: string
  manufacturer?: string
  is_enabled?: boolean
  provider_ids?: string[]
}

// ── Model API ──

const BASE = '/model-management'

export async function fetchModels(page = 1, pageSize = 10): Promise<PaginatedResponse<Model>> {
  const { data } = await authClient.get<PaginatedResponse<Model>>(`${BASE}/models`, {
    params: { page, page_size: pageSize },
  })
  return data
}

export async function createModel(payload: ModelCreateData): Promise<Model> {
  const { data } = await authClient.post<Model>(`${BASE}/models`, payload)
  return data
}

export async function updateModel(modelId: string, payload: ModelUpdateData): Promise<Model> {
  const { data } = await authClient.put<Model>(`${BASE}/models/${modelId}`, payload)
  return data
}

export async function deleteModel(modelId: string): Promise<void> {
  await authClient.delete(`${BASE}/models/${modelId}`)
}
