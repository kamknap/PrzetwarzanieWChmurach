import { useState, useEffect, useMemo, useCallback } from 'react'
import movieService from '../services/movieService'
import MovieManagement from './MovieManagement'
import MovieEdit from './MovieEdit'
import authService from '../services/authService'
import MyRentals from './MyRentals'
import PendingReturns from './PendingReturns'
import AllRentals from './AllRentals'
import AdminRentMovie from './AdminRentMovie'

export default function MovieContainer() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [genres, setGenres] = useState([])
  
  // Stan "zatwierdzony" (używany do pobierania danych)
  const [filters, setFilters] = useState({ genre: '', year: '', search: '' })
  
  // Stan "roboczy" formularzy (do wpisywania)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearSearch, setYearSearch] = useState('') // Nowy stan dla roku

  const [showMovieManagement, setShowMovieManagement] = useState(false)
  const [editingMovie, setEditingMovie] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showMyRentals, setShowMyRentals] = useState(false)
  const [showPendingReturns, setShowPendingReturns] = useState(false)
  const [showAllRentals, setShowAllRentals] = useState(false)
  const [showAdminRentMovie, setShowAdminRentMovie] = useState(false)

  // 🔹 1. Inicjalizacja
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

  // 🔹 2. Debounce dla wyszukiwania TYTUŁU i ROKU
  // Czeka 500ms po ostatnim naciśnięciu klawisza zanim zaktualizuje filtry
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ 
        ...prev, 
        search: searchTerm,
        year: yearSearch 
      }))
      if (searchTerm !== filters.search || yearSearch !== filters.year) {
        setCurrentPage(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, yearSearch])

  // 🔹 3. Pobieranie danych po zmianie zatwierdzonych filtrów
  useEffect(() => {
    fetchMovies(currentPage, filters)
  }, [filters.genre, filters.year, filters.search, currentPage])

  const fetchMovies = async (page = 1, activeFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const response = await movieService.getMovies({
        page,
        per_page: 12,
        genre: activeFilters.genre || undefined,
        year: activeFilters.year ? Number(activeFilters.year) : undefined,
        search: activeFilters.search || undefined,
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

  // Obsługa Selecta (Gatunek) - działa natychmiast
  const handleGenreChange = useCallback((value) => {
    setFilters(prev => ({
      ...prev,
      genre: value,
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
      await fetchMovies(currentPage, filters)
    } catch (error) {
      alert(error.message || 'Nie udało się wypożyczyć filmu')
    }
  }

  const handleReturn = async (movieId, movieTitle) => {
    if (!window.confirm(`Czy na pewno chcesz zwrócić film "${movieTitle}"?`)) return

    try {
      await movieService.returnMovie(movieId)
      alert(`Film "${movieTitle}" został zwrócony!`)
      await fetchMovies(currentPage, filters)
    } catch (error) {
      alert(error.message || 'Nie udało się zwrócić filmu')
    }
  }

  const processedMovies = useMemo(() => movies, [movies])

  // --- RENDERING (Zmiana: Nie używamy wczesnego return dla loading/error) ---

  return (
    <div className="movie-container">

      {/* --- Sekcja Przycisków (zawsze widoczna) --- */}
      {isAdmin && (
        <div className="admin-movie-actions">
          <button onClick={() => setShowMovieManagement(true)} className="admin-btn">
            + Dodaj nowy film
          </button>
          <button
            onClick={() => setShowPendingReturns(true)}
            className="admin-btn"
            style={{ marginLeft: '1rem', backgroundColor: '#f59e0b' }}
          >
            🔄 Oczekujące zwroty
          </button>
          <button
            onClick={() => setShowAllRentals(true)}
            className="admin-btn"
            style={{ marginLeft: '1rem', backgroundColor: '#8b5cf6' }}
          >
            📋 Wszystkie wypożyczenia
          </button>
          <button
            onClick={() => setShowAdminRentMovie(true)}
            className="admin-btn"
            style={{ marginLeft: '1rem', backgroundColor: '#10b981' }}
          >
            🎬 Wypożycz dla klienta
          </button>
        </div>
      )}

      {!isAdmin && (
        <div className="user-rental-actions">
          <button onClick={() => setShowMyRentals(true)} className="rental-btn">
            🎞 Moje wypożyczenia
          </button>
        </div>
      )}

      {/* --- Sekcja Filtrów (zawsze widoczna - to naprawia problem focusu) --- */}
      <div className="movie-filters">
        <div className="filter-group" style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            placeholder="Szukaj filmów..."
            value={searchTerm} // Używamy lokalnego stanu
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group" style={{ flex: '1 1 160px' }}>
          <select
            value={filters.genre}
            onChange={(e) => handleGenreChange(e.target.value)}
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
            value={yearSearch} // Używamy lokalnego stanu
            onChange={(e) => setYearSearch(e.target.value)}
            className="year-input"
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>

        <button
          onClick={() => {
            setFilters({ genre: '', year: '', search: '' })
            setSearchTerm('')
            setYearSearch('')
            setCurrentPage(1)
          }}
          className="clear-filters-btn"
          style={{ flex: '0 0 auto', height: '40px', alignSelf: 'center' }}
        >
          Wyczyść filtry
        </button>
      </div>

      {/* --- Sekcja Treści (Zmienia się w zależności od stanu) --- */}
      
      {loading ? (
        <div className="loading-container">
          <p>Ładowanie filmów...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchMovies(currentPage, filters)} className="submit-btn">
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <>
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
                        <button onClick={() => handleRent(movie.id, movie.title)} className="rent-btn">
                          🎬 Wypożycz
                        </button>
                      ) : (
                        <button onClick={() => handleReturn(movie.id, movie.title)} className="return-btn">
                          🔁 Zwróć
                        </button>
                      )}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="movie-admin-actions">
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(movie)} className="edit-btn">
                          Edytuj
                        </button>
                        <button onClick={() => handleDelete(movie.id, movie.title)} className="delete-movie-btn">
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
        </>
      )}

      {/* --- Modale --- */}
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
            <button onClick={() => setShowMyRentals(false)} className="close-btn">✖</button>
            <MyRentals />
          </div>
        </div>
      )}

      {showPendingReturns && <PendingReturns onClose={() => setShowPendingReturns(false)} />}
      {showAllRentals && <AllRentals onClose={() => setShowAllRentals(false)} />}
      {showAdminRentMovie && (
        <AdminRentMovie 
          onClose={() => setShowAdminRentMovie(false)}
          onRentalCreated={() => fetchMovies(currentPage, filters)}
        />
      )}
    </div>
  )
}