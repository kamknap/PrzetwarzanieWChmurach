import { useEffect, useState } from 'react'
import movieService from '../services/movieService'

export default function PendingReturns({ onClose }) {
  const [pendingReturns, setPendingReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPendingReturns = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await movieService.getPendingReturns()
      setPendingReturns(data)
    } catch (err) {
      setError('Nie udało się pobrać listy oczekujących zwrotów: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (rental) => {
    if (!window.confirm(`Czy na pewno chcesz zatwierdzić zwrot filmu "${rental.movieTitle}" od ${rental.clientName}?`)) return
    
    try {
      await movieService.approveReturn(rental._id)
      alert(`Zwrot filmu "${rental.movieTitle}" został zatwierdzony!`)
      fetchPendingReturns()
    } catch (error) {
      alert(error.message || 'Nie udało się zatwierdzić zwrotu')
    }
  }

  useEffect(() => {
    fetchPendingReturns()
  }, [])

  if (loading) {
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
      <div className="modal-content" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2>🔄 Oczekujące zwroty filmów</h2>
          <button onClick={onClose} className="close-btn">✖</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {pendingReturns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Brak oczekujących zwrotów filmów.
          </div>
        ) : (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f3f4f6', 
                  borderBottom: '2px solid #e5e7eb',
                  position: 'sticky',
                  top: 0
                }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Film</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Klient</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Data wypożyczenia</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Planowany zwrot</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Data zgłoszenia</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {pendingReturns.map((rental) => (
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
                      <strong>{rental.movieTitle}</strong>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div>{rental.clientName}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {rental.clientEmail}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {rental.rentalDate ? new Date(rental.rentalDate).toLocaleDateString('pl-PL') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {rental.plannedReturnDate ? new Date(rental.plannedReturnDate).toLocaleDateString('pl-PL') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {rental.returnRequestDate ? new Date(rental.returnRequestDate).toLocaleDateString('pl-PL') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleApprove(rental)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                      >
                        ✓ Zatwierdź zwrot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
