import { useState, useEffect } from 'react'
import movieService from '../services/MovieService'

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

  useEffect(() => {
    fetchGenres()
  }, [])

  useEffect(() => {
    fetchMovies()
  }, [currentPage, filters])

  const fetchGenres = async () => {
    try {
      const response = await movieService.getGenres()
      setGenres(response.genres)
    } catch (error) {
      console.error('Error fetching genres:', error)
    }
  }

  const fetchMovies = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching movies with params:', {
        page: currentPage,
        per_page: 12,
        ...filters
      })
      
      const response = await movieService.getMovies({
        page: currentPage,
        per_page: 12,
        ...filters
      })
      
      console.log('Movies response:', response)
      setMovies(response.movies)
      setTotalPages(response.total_pages)
    } catch (error) {
      console.error('Detailed error fetching movies:', error)
      setError(`Błąd podczas pobierania filmów: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

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
        {movies.map(movie => (
          <div key={movie.id} className="movie-card">
            <div className="movie-info">
              <h3 className="movie-title">{movie.title}</h3>
              <p className="movie-year">{movie.year}</p>
              <p className="movie-director">Reżyseria: {movie.director}</p>
              <p className="movie-duration">{movie.duration} min</p>
              <div className="movie-genres">
                {movie.genres.map(genre => (
                  <span key={genre} className="genre-tag">{genre}</span>
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
    </div>
  )
}