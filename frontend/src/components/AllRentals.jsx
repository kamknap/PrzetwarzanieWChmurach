import { useEffect, useState } from 'react'
import movieService from '../services/MovieService'

export default function AllRentals({ onClose }) {
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('rentalDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchRentals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await movieService.getAllRentals({
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        status_filter: statusFilter || undefined
      })
      setRentals(data)
    } catch (err) {
      setError('Nie udało się pobrać listy wypożyczeń: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRentals()
  }, [sortBy, sortOrder, statusFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchRentals()
  }

  const getStatusBadge = (status) => {
    const badges = {
      'active': { text: 'Aktywne', color: '#10b981' },
      'pending_return': { text: 'Oczekuje zwrotu', color: '#f59e0b' },
      'returned': { text: 'Zwrócone', color: '#6b7280' }
    }
    const badge = badges[status] || { text: status, color: '#6b7280' }
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        backgroundColor: badge.color,
        color: 'white',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: 500
      }}>
        {badge.text}
      </span>
    )
  }

  if (loading && rentals.length === 0) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <button onClick={onClose} className="close-btn">✖</button>
          <div className="loading-container"><p>Ładowanie...</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2>📋 Wszystkie wypożyczenia</h2>
          <button onClick={onClose} className="close-btn">✖</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Filtry i wyszukiwanie */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <form onSubmit={handleSearch} style={{ flex: '1 1 300px', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Szukaj po kliencie, filmie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
            <button 
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              🔍 Szukaj
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            >
              <option value="">Wszystkie statusy</option>
              <option value="active">Aktywne</option>
              <option value="pending_return">Oczekuje zwrotu</option>
              <option value="returned">Zwrócone</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            >
              <option value="rentalDate">Sortuj: Data wypożyczenia</option>
              <option value="clientName">Sortuj: Klient</option>
              <option value="movieTitle">Sortuj: Film</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Tabela wypożyczeń */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 250px)' }}>
          {rentals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              Brak wypożyczeń do wyświetlenia.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f3f4f6', 
                  borderBottom: '2px solid #e5e7eb',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Klient</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Film</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Data wypożyczenia</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Plan. zwrot</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Faktyczny zwrot</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => (
                  <tr 
                    key={rental._id}
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{rental.clientName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {rental.clientEmail}
                      </div>
                      {rental.clientPhone && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          📞 {rental.clientPhone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: 500 }}>{rental.movieTitle}</div>
                      {rental.movieGenres && rental.movieGenres.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {rental.movieGenres.join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {rental.rentalDate ? (
                        <>
                          <div>{new Date(rental.rentalDate).toLocaleDateString('pl-PL')}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {new Date(rental.rentalDate).toLocaleTimeString('pl-PL')}
                          </div>
                        </>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {rental.plannedReturnDate ? 
                        new Date(rental.plannedReturnDate).toLocaleDateString('pl-PL') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {rental.actualReturnDate ? (
                        <>
                          <div>{new Date(rental.actualReturnDate).toLocaleDateString('pl-PL')}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {new Date(rental.actualReturnDate).toLocaleTimeString('pl-PL')}
                          </div>
                        </>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {getStatusBadge(rental.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <strong>Znaleziono:</strong> {rentals.length} wypożyczeń
        </div>
      </div>
    </div>
  )
}
