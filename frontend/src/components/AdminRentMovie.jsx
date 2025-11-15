import { useState } from 'react'
import movieService from '../services/MovieService'

export default function AdminRentMovie({ onClose, onRentalCreated }) {
  const [formData, setFormData] = useState({
    movieId: '',
    movieTitle: '',
    clientIdentifier: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.movieId || !formData.clientIdentifier) {
      setError('Wypełnij wszystkie pola')
      return
    }

    setIsLoading(true)

    try {
      const result = await movieService.adminRentMovie(
        formData.movieId,
        formData.clientIdentifier
      )
      
      setSuccess(result.message || 'Film został wypożyczony!')
      
      // Wyczyść formularz
      setFormData({
        movieId: '',
        movieTitle: '',
        clientIdentifier: ''
      })

      // Odśwież listę po 1.5 sekundy
      setTimeout(() => {
        if (onRentalCreated) onRentalCreated()
        onClose()
      }, 1500)
      
    } catch (err) {
      setError(err.message || 'Nie udało się wypożyczyć filmu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>🎬 Wypożycz film dla klienta</h2>
          <button onClick={onClose} className="close-btn">✖</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #6ee7b7'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informacje o filmie</h3>
            
            <div className="form-group">
              <label htmlFor="movieId">ID Filmu *</label>
              <input
                type="text"
                id="movieId"
                name="movieId"
                value={formData.movieId}
                onChange={handleChange}
                placeholder="np. 507f1f77bcf86cd799439011"
                required
              />
              <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                Możesz znaleźć ID filmu w liście filmów
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="movieTitle">Tytuł filmu (opcjonalnie)</label>
              <input
                type="text"
                id="movieTitle"
                name="movieTitle"
                value={formData.movieTitle}
                onChange={handleChange}
                placeholder="Dla Twojej wygody"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Informacje o kliencie</h3>
            
            <div className="form-group">
              <label htmlFor="clientIdentifier">Klient *</label>
              <input
                type="text"
                id="clientIdentifier"
                name="clientIdentifier"
                value={formData.clientIdentifier}
                onChange={handleChange}
                placeholder="Email, ID klienta lub 'Imię Nazwisko'"
                required
              />
              <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                Możesz wpisać:
                <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                  <li>Email klienta (np. jan.kowalski@example.com)</li>
                  <li>ID klienta (np. 507f1f77bcf86cd799439011)</li>
                  <li>Imię i nazwisko (np. Jan Kowalski)</li>
                </ul>
              </small>
            </div>
          </div>

          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}>
            <strong>⚠️ Uwaga:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Film musi być dostępny do wypożyczenia</li>
              <li>Klient nie może mieć więcej niż 3 aktywne wypożyczenia</li>
              <li>Okres wypożyczenia: 2 dni</li>
            </ul>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              {isLoading ? 'Wypożyczanie...' : '✓ Wypożycz film'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
