import { useState } from 'react'
import movieService from '../services/MovieService'

export default function MovieManagement({ onClose, onMovieChange }) {
  const [movieData, setMovieData] = useState({
    title: '',
    year: new Date().getFullYear(),
    genres: '',
    language: '',
    country: '',
    duration: 0,
    description: '',
    director: '',
    rating: 0,
    actors: '',
    is_available: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setMovieData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validateForm = () => {
    if (!movieData.title.trim()) {
      setError('Tytuł jest wymagany')
      return false
    }
    
    if (movieData.year < 1800 || movieData.year > new Date().getFullYear() + 10) {
      setError('Nieprawidłowy rok')
      return false
    }

    if (!movieData.genres.trim()) {
      setError('Podaj przynajmniej jeden gatunek')
      return false
    }

    if (movieData.duration <= 0) {
      setError('Czas trwania musi być większy od 0')
      return false
    }

    if (movieData.rating < 0 || movieData.rating > 10) {
      setError('Ocena musi być w zakresie 0-10')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Przygotuj dane
      const submitData = {
        ...movieData,
        year: parseInt(movieData.year),
        duration: parseInt(movieData.duration),
        rating: parseFloat(movieData.rating),
        genres: movieData.genres.split(',').map(g => g.trim()).filter(g => g),
        actors: movieData.actors.split(',').map(a => a.trim()).filter(a => a)
      }

      await movieService.createMovie(submitData)
      setSuccess('Film został dodany pomyślnie!')
      
      // Wyczyść formularz
      setMovieData({
        title: '',
        year: new Date().getFullYear(),
        genres: '',
        language: '',
        country: '',
        duration: 0,
        description: '',
        director: '',
        rating: 0,
        actors: '',
        is_available: true
      })

      if (onMovieChange) {
        onMovieChange()
      }

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError('Błąd dodawania filmu: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dodaj nowy film</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Podstawowe informacje</h3>
            <div className="form-group">
              <label htmlFor="title">Tytuł:*</label>
              <input
                type="text"
                id="title"
                name="title"
                value={movieData.title}
                onChange={handleChange}
                required
                placeholder="Wprowadź tytuł filmu"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="year">Rok produkcji:*</label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={movieData.year}
                  onChange={handleChange}
                  required
                  min="1800"
                  max={new Date().getFullYear() + 10}
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Czas trwania (min):*</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={movieData.duration}
                  onChange={handleChange}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="rating">Ocena (0-10):*</label>
                <input
                  type="number"
                  id="rating"
                  name="rating"
                  value={movieData.rating}
                  onChange={handleChange}
                  required
                  min="0"
                  max="10"
                  step="0.1"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="language">Język:*</label>
                <input
                  type="text"
                  id="language"
                  name="language"
                  value={movieData.language}
                  onChange={handleChange}
                  required
                  placeholder="np. Polski, Angielski"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">Kraj produkcji:*</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={movieData.country}
                  onChange={handleChange}
                  required
                  placeholder="np. Polska, USA"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="genres">Gatunki (oddzielone przecinkami):*</label>
              <input
                type="text"
                id="genres"
                name="genres"
                value={movieData.genres}
                onChange={handleChange}
                required
                placeholder="np. Akcja, Dramat, Komedia"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Szczegóły</h3>
            <div className="form-group">
              <label htmlFor="director">Reżyser:*</label>
              <input
                type="text"
                id="director"
                name="director"
                value={movieData.director}
                onChange={handleChange}
                required
                placeholder="Imię i nazwisko reżysera"
              />
            </div>

            <div className="form-group">
              <label htmlFor="actors">Aktorzy (oddzieleni przecinkami):*</label>
              <input
                type="text"
                id="actors"
                name="actors"
                value={movieData.actors}
                onChange={handleChange}
                required
                placeholder="np. Jan Kowalski, Anna Nowak"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Opis:*</label>
              <textarea
                id="description"
                name="description"
                value={movieData.description}
                onChange={handleChange}
                required
                rows="4"
                placeholder="Krótki opis fabuły filmu"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_available"
                  checked={movieData.is_available}
                  onChange={handleChange}
                />
                <span>Dostępny do wypożyczenia</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Anuluj
            </button>
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Dodawanie...' : 'Dodaj film'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}