export const TOKEN_KEY = "fastvisa_admin_token"
export const LOGGED_IN_COOKIE = "fastvisa_admin_logged_in"

/** 30 ngày — phiên giữ sau khi đóng/mở trình duyệt */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function getToken(): string | null {
 if (typeof window === "undefined") return null
 return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string): void {
 localStorage.setItem(TOKEN_KEY, token)
 // Fallback client cookie — route `/api/auth/login` set httpOnly cookie chính
 document.cookie = `${LOGGED_IN_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`
}

export function clearAuth(): void {
 localStorage.removeItem(TOKEN_KEY)
 document.cookie = `${LOGGED_IN_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

/** Xóa localStorage + cookie httpOnly qua route admin */
export async function clearSession(): Promise<void> {
 clearAuth()
 try {
 await fetch("/api/auth/logout", { method: "POST" })
 } catch {
 // Bỏ qua khi mất mạng — localStorage đã xóa
 }
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))

    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

export function getEmailFromToken(): string | null {
  const token = getToken()
  if (!token) return null
  const decoded = parseJwt(token)
  return decoded?.email || null
}

export function getRoleFromToken(): string | null {
  const token = getToken()
  if (!token) return null
  const decoded = parseJwt(token)
  return decoded?.role || null
}
