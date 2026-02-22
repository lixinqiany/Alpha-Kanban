import axios, { type AxiosRequestConfig } from 'axios'

// 公开实例：用于登录、注册、刷新 token，无拦截器
export const publicClient = axios.create({
  baseURL: '/api',
})

// 认证实例：用于需要鉴权的业务请求
export const authClient = axios.create({
  baseURL: '/api',
})

// 请求拦截器：注入 Access Token
authClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 静默刷新状态
let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  for (const { resolve, reject } of pendingQueue) {
    if (token) {
      resolve(token)
    } else {
      reject(error)
    }
  }
  pendingQueue = []
}

// 响应拦截器：401 时静默刷新 token
authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retried?: boolean }

    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error)
    }

    // 已有刷新请求在进行中，排队等待
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` }
        return authClient(originalRequest)
      })
    }

    originalRequest._retried = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      isRefreshing = false
      processQueue(error, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      const { data } = await publicClient.post<{ access_token: string }>('/user/refresh', {
        refresh_token: refreshToken,
      })
      const newToken = data.access_token
      localStorage.setItem('access_token', newToken)
      processQueue(null, newToken)

      originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` }
      return authClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
