const API_BASE_URL = import.meta.env.VITE_MOVIES_API_URL || 'http://localhost:8001'

class MovieService {
  getAuthHeaders() {
    const token = localStorage.getItem('auth_token') // Zmieniono z 'token' na 'auth_token'
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  async getMovies(params = {}) {
    const {
      page = 1,
      per_page = 10,
      genre,
      year,
      available_only = true,
      search
    } = params

    const queryParams = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
      available_only: available_only.toString()
    })

    if (genre) queryParams.append('genre', genre)
    if (year) queryParams.append('year', year.toString())
    if (search) queryParams.append('search', search)

    try {
      const response = await fetch(`${API_BASE_URL}/movies?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching movies:', error)
      throw error
    }
  }

  async getMovie(movieId) {
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movieId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching movie:', error)
      throw error
    }
  }

  async getGenres() {
    try {
      const response = await fetch(`${API_BASE_URL}/genres`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching genres:', error)
      throw error
    }
  }

  async createMovie(movieData) {
  try {
    const response = await fetch(`${API_BASE_URL}/movies`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(movieData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Błąd tworzenia filmu')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating movie:', error)
    throw error
  }
}

async updateMovie(movieId, movieData) {
  try {
    const response = await fetch(`${API_BASE_URL}/movies/${movieId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(movieData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Błąd aktualizacji filmu')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating movie:', error)
    throw error
  }
}

async deleteMovie(movieId) {
  try {
    const response = await fetch(`${API_BASE_URL}/movies/${movieId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Błąd usuwania filmu')
    }

    return await response.json()
  } catch (error) {
    console.error('Error deleting movie:', error)
    throw error
  }
}

}

const movieService = new MovieService()
export default movieService
