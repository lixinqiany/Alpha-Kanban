interface TokenPayload {
  sub: string
  role: string
  exp: number
}

/** 解析 JWT payload（仅 Base64 解码，不做签名校验） */
export function parseToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return null
    const payload = JSON.parse(atob(base64))
    return payload as TokenPayload
  } catch {
    return null
  }
}

/** 从 localStorage 读取 access_token 并解析 */
export function getCurrentUser(): TokenPayload | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  return parseToken(token)
}

/** 判断当前用户是否为 admin */
export function isAdmin(): boolean {
  const user = getCurrentUser()
  return user?.role === 'admin'
}
