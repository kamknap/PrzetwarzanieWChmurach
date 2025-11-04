import { useState, useEffect, useMemo } from 'react'
import { useCallback, useRef } from 'react'
import movieService from '../services/MovieService'
import MovieManagement from './MovieManagement'
import MovieEdit from './MovieEdit'
import authService from '../services/authService'

export default function MovieContainer() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [genres, setGenres] = useState([])
  const [filters, setFilters] = useState({
    genre: '',
    year: '',
    search: ''
  })
  const [showMovieManagement, setShowMovieManagement] = useState(false)
  const [editingMovie, setEditingMovie] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // 🔹 1. Uruchamia się tylko raz — przy starcie aplikacji
useEffect(() => {
  const init = async () => {
    const user = authService.getUser()
    setIsAdmin(user?.role === 'admin')

    try {
      const response = await movieService.getGenres()
      setGenres(response.genres)
    } catch (error) {
      console.error('Error fetching genres:', error)
    }

    // Po wczytaniu gatunków – pobierz pierwszą listę filmów
    await fetchMovies()
  }

  init()
}, [])

// 🔹 2. Reaguje na zmiany filtrów lub paginacji — z opóźnieniem (debounce)
useEffect(() => {
  const timeoutId = setTimeout(() => {
    fetchMovies()
  }, 500) // 0.5 sekundy od ostatniej zmiany

  return () => clearTimeout(timeoutId)
}, [currentPage, filters])

const fetchMovies = async (page = currentPage, activeFilters = filters) => {
  setLoading(true)
  setError(null)

  try {
    const response = await movieService.getMovies({
      page,
      per_page: 12,
      ...activeFilters
    })

    setMovies(response.movies)
    setTotalPages(response.total_pages)
  } catch (error) {
    console.error('Detailed error fetching movies:', error)
    setError(`Błąd podczas pobierania filmów: ${error.message}`)
  } finally {
    setLoading(false)
  }
}

// reaguje tylko na interakcje użytkownika, nie na każdy render
const fetchTimeout = useRef(null)

const handleFilterChange = useCallback((key, value) => {
  const newFilters = { ...filters, [key]: value }
  setFilters(newFilters)
  setCurrentPage(1)

  // usuń poprzedni timeout (żeby nie odpytywać przy każdym znaku)
  if (fetchTimeout.current) {
    clearTimeout(fetchTimeout.current)
  }

  // odczekaj 400 ms po ostatnim wpisaniu
  fetchTimeout.current = setTimeout(() => {
    fetchMovies(1, newFilters)
  }, 400)
}, [filters])

const handlePageChange = (page) => {
  setCurrentPage(page)
  fetchMovies(page, filters)
}


  const handleDelete = async (movieId, movieTitle) => {
    if (!confirm(`Czy na pewno chcesz usunąć film "${movieTitle}"?`)) {
      return
    }

    try {
      await movieService.deleteMovie(movieId)
      setError(null)
      fetchMovies()
    } catch (error) {
      setError('Błąd usuwania filmu: ' + error.message)
    }
  }

  const handleEdit = (movie) => {
    setEditingMovie(movie)
  }

  // Memoizacja ciężkich obliczeń
  const processedMovies = useMemo(() => {
    return movies.map(movie => ({
      ...movie,
      // Przetwarzanie danych tylko gdy się zmieniają
    }))
  }, [movies])

  if (loading) {
    return (
      <div className="loading-container">
        <p>Ładowanie filmów...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={fetchMovies}>Spróbuj ponownie</button>
      </div>
    )
  }

  return (
    <div className="movie-container">
      {isAdmin && (
        <div className="admin-movie-actions">
          <button 
            onClick={() => setShowMovieManagement(true)}
            className="admin-btn"
          >
            + Dodaj nowy film
          </button>
        </div>
      )}

      <div className="movie-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Szukaj filmów..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="genre-select"
          >
            <option value="">Wszystkie gatunki</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <input
            type="number"
            placeholder="Rok"
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="year-input"
          />
        </div>

        <button onClick={() => {
          setFilters({ genre: '', year: '', search: '' })
          setCurrentPage(1)
        }} className="clear-filters-btn">
          Wyczyść filtry
        </button>
      </div>

      <div className="movies-grid">
        {processedMovies.map(movie => (
          <div key={movie.id} className="movie-card">
            <div className="movie-info">
              <h3 className="movie-title">{movie.title}</h3>
              <p className="movie-year">{movie.year}</p>
              <p className="movie-director">Reżyseria: {movie.director}</p>
              <p className="movie-duration">{movie.duration} min</p>
              
              <div className="movie-genres">
                {movie.genres.map((genre, index) => (
                  <span key={index} className="genre-tag">
                    {genre}
                  </span>
                ))}
              </div>


              <p className="movie-rating">Ocena: {movie.rating}/10</p>
              <p className="movie-description">{movie.description}</p>
              <div className="movie-actors">
                <strong>Obsada:</strong> {movie.actors.join(', ')}
              </div>
              <div className="movie-availability">
                {movie.is_available ? (
                  <span className="available">Dostępny</span>
                ) : (
                  <span className="unavailable">Niedostępny</span>
                )}
              </div>
              
              {isAdmin && (
                <div className="movie-admin-actions">
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(movie)}
                      className="edit-btn"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleDelete(movie.id, movie.title)}
                      className="delete-movie-btn"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Poprzednia
          </button>
          
          <span className="pagination-info">
            Strona {currentPage} z {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Następna
          </button>
        </div>
      )}

      {showMovieManagement && (
        <MovieManagement 
          onClose={() => setShowMovieManagement(false)}
          onMovieChange={fetchMovies}
        />
      )}

      {editingMovie && (
        <MovieEdit
          movie={editingMovie}
          onClose={() => setEditingMovie(null)}
          onMovieChange={fetchMovies}
        />
      )}
    </div>
  )
}