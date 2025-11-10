import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import movieService from '../services/MovieService'
import MovieManagement from './MovieManagement'
import MovieEdit from './MovieEdit'
import authService from '../services/authService'
import MyRentals from './MyRentals'

export default function MovieContainer() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [genres, setGenres] = useState([])
  const [filters, setFilters] = useState({ genre: '', year: '', search: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [showMovieManagement, setShowMovieManagement] = useState(false)
  const [editingMovie, setEditingMovie] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMyRentals, setShowMyRentals] = useState(false)

  // 🔹 1. Inicjalizacja - raz po załadowaniu
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

      await fetchMovies(1, filters)
    }

    init()
  }, [])

  // 🔹 2. Debounce dla wyszukiwania (searchTerm → filters.search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 🔹 3. Reaguj na zmiany filtrów (oprócz searchTerm) lub paginacji
  useEffect(() => {
    // fetchMovies działa na aktualnych wartości filtra
    fetchMovies(currentPage, filters)
  }, [filters.genre, filters.year, currentPage])

  const fetchMovies = async (page = 1, activeFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const response = await movieService.getMovies({
        page,
        per_page: 12,
        genre: filters.genre || undefined,
        year: filters.year ? Number(filters.year) : undefined,
        search: filters.search || undefined,
        available_only: true,
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

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
    setCurrentPage(1)
  }, [])

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // Operacje admin
  const handleDelete = async (movieId, movieTitle) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć film "${movieTitle}"?`)) return

    try {
      await movieService.deleteMovie(movieId)
      setError(null)
      fetchMovies(currentPage, filters)
    } catch (error) {
      setError('Błąd usuwania filmu: ' + error.message)
    }
  }

  const handleEdit = (movie) => {
    setEditingMovie(movie)
  }

  // Obsługa wypożyczeń
  const handleRent = async (movieId, movieTitle) => {
    if (!window.confirm(`Czy na pewno chcesz wypożyczyć film "${movieTitle}"?`)) return

    try {
      await movieService.rentMovie(movieId)
      alert(`Film "${movieTitle}" został wypożyczony!`)
      fetchMovies(currentPage, filters)
    } catch (error) {
      alert(error.message || 'Nie udało się wypożyczyć filmu')
    }
  }

  const handleReturn = async (movieId, movieTitle) => {
    if (!window.confirm(`Czy na pewno chcesz zwrócić film "${movieTitle}"?`)) return

    try {
      await movieService.returnMovie(movieId)
      alert(`Film "${movieTitle}" został zwrócony!`)
      fetchMovies(currentPage, filters)
    } catch (error) {
      alert(error.message || 'Nie udało się zwrócić filmu')
    }
  }

  // Memoizacja przetworzonych filmów (jeśli planujesz rozszerzać)
  const processedMovies = useMemo(() => movies, [movies])

  if (loading) {
    return (
      <div className="loading-container">
        <p>Ładowanie filmów...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{error}</p>
        <button onClick={() => fetchMovies(currentPage, filters)} className="submit-btn">Spróbuj ponownie</button>
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

      {!isAdmin && (
        <div className="user-rental-actions">
          <button
            onClick={() => setShowMyRentals(true)}
            className="rental-btn"
          >
            🎞 Moje wypożyczenia
          </button>
        </div>
      )}

      <div className="movie-filters">

        <div className="filter-group" style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            placeholder="Szukaj filmów..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group" style={{ flex: '1 1 160px' }}>
          <select
            value={filters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="genre-select"
          >
            <option value="">Wszystkie gatunki</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ flex: '1 1 100px' }}>
          <input
            type="number"
            placeholder="Rok"
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="year-input"
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>

        <button
          onClick={() => {
            setFilters({ genre: '', year: '', search: '' })
            setSearchTerm('')
            setCurrentPage(1)
          }}
          className="clear-filters-btn"
          style={{ flex: '0 0 auto', height: '40px', alignSelf: 'center' }}
        >
          Wyczyść filtry
        </button>
      </div>

      <div className="movies-grid">
        {processedMovies.map((movie) => (
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

              {!isAdmin && (
                <div className="movie-user-actions">
                  {movie.is_available ? (
                    <button
                      onClick={() => handleRent(movie.id, movie.title)}
                      className="rent-btn"
                    >
                      🎬 Wypożycz
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReturn(movie.id, movie.title)}
                      className="return-btn"
                    >
                      🔁 Zwróć
                    </button>
                  )}
                </div>
              )}

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
          onMovieChange={() => fetchMovies(currentPage, filters)}
        />
      )}

      {editingMovie && (
        <MovieEdit
          movie={editingMovie}
          onClose={() => setEditingMovie(null)}
          onMovieChange={() => fetchMovies(currentPage, filters)}
        />
      )}

      {showMyRentals && (
        <div className="overlay">
          <div className="modal">
            <button
              onClick={() => setShowMyRentals(false)}
              className="close-btn"
            >
              ✖
            </button>
            <MyRentals />
          </div>
        </div>
      )}
    </div>
  )
}
