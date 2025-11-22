const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Initialize token from localStorage if available
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token")
      if (storedToken) {
        this.token = storedToken
      }
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const status = response.status
      let data: T | undefined
      let error: string | undefined

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const json = await response.json()
        if (response.ok) {
          data = json
        } else {
          error = json.detail || json.message || `HTTP ${status} error`
        }
      } else {
        const text = await response.text()
        if (response.ok) {
          // Try to parse as JSON if possible
          try {
            data = JSON.parse(text) as T
          } catch {
            data = text as unknown as T
          }
        } else {
          error = text || `HTTP ${status} error`
        }
      }

      return { data, error, status }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Network error",
        status: 0,
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete(endpoint: string): Promise<ApiResponse<void>> {
    return this.request<void>(endpoint, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
