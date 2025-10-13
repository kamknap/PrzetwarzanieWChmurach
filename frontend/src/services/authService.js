// Serwis do komunikacji z Auth API

const API_BASE_URL = import.meta.env.VITE_AUTH_API || 'http://localhost:8000'

class AuthService {
  constructor() {
    this.token = localStorage.getItem('auth_token')
    this.user = this.token ? JSON.parse(localStorage.getItem('user') || '{}') : null
  }

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Błąd logowania')
      }

      const data = await response.json()
      
      this.token = data.access_token
      this.user = data.user
      localStorage.setItem('auth_token', this.token)
      localStorage.setItem('user', JSON.stringify(this.user))

      return data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Błąd rejestracji')
      }

      const data = await response.json()
      
      this.token = data.access_token
      this.user = data.user
      localStorage.setItem('auth_token', this.token)
      localStorage.setItem('user', JSON.stringify(this.user))

      return data
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  async getMe() {
    if (!this.token) {
      throw new Error('Brak tokena autoryzacji')
    }

    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.logout()
        }
        throw new Error('Błąd pobierania danych użytkownika')
      }

      const user = await response.json()
      this.user = user
      localStorage.setItem('user', JSON.stringify(this.user))
      
      return user
    } catch (error) {
      console.error('Get me error:', error)
      throw error
    }
  }

  logout() {
    this.token = null
    this.user = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  isLoggedIn() {
    return !!this.token && !!this.user
  }

  getUser() {
    return this.user
  }

  getToken() {
    return this.token
  }

  async makeAuthenticatedRequest(url, options = {}) {
    if (!this.token) {
      throw new Error('Brak tokena autoryzacji')
    }

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok && response.status === 401) {
      this.logout()
      throw new Error('Sesja wygasła. Zaloguj się ponownie.')
    }

    return response
  }
}

const authService = new AuthService()
export default authService