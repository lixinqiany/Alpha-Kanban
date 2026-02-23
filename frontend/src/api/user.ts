import { publicClient } from './client'

interface RegisterResponse {
  id: string
  username: string
  created_at: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export async function register(username: string, password: string): Promise<RegisterResponse> {
  const { data } = await publicClient.post<RegisterResponse>('/user/register', {
    username,
    password,
  })
  return data
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const { data } = await publicClient.post<TokenResponse>('/user/login', { username, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data
}
