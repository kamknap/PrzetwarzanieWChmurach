import { useEffect, useState } from 'react'
import movieService from '../services/MovieService'

export default function MyRentals() {
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRentals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await movieService.getMyRentals()
      setRentals(data)
    } catch (err) {
      setError('Nie udało się pobrać listy wypożyczeń: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (rental) => {
    if (!window.confirm(`Czy chcesz zwrócić film "${rental.movieTitle}"?`)) return
    try {
      await movieService.returnMovie(rental.movieId)
      alert(`Film "${rental.movieTitle}" został zwrócony.`)
      fetchRentals()
    } catch (error) {
      alert(error.message || 'Nie udało się zwrócić filmu')
    }
  }

  const handleDelete = async (rental) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć wypożyczenie "${rental.movieTitle}" z historii?`)) return
    try {
      await movieService.deleteRental(rental._id)
      alert(`Wypożyczenie "${rental.movieTitle}" zostało usunięte z historii.`)
      fetchRentals()
    } catch (error) {
      alert(error.message || 'Nie udało się usunąć wypożyczenia')
    }
  }

  useEffect(() => {
    fetchRentals()
  }, [])

  if (loading) {
    return <div className="loading-container"><p>Ładowanie wypożyczeń...</p></div>
  }

  if (error) {
    return <div className="error-message">{error}</div>
  }

  if (rentals.length === 0) {
    return <div className="no-clients">Nie masz żadnych wypożyczeń.</div>
  }

  return (
    <div className="my-rentals-container">
      <h2 style={{
        textAlign: "center",
        color: "#1e293b",
        margin: "0 0 2rem"
      }}>🎞 Moje wypożyczenia</h2>
      <div className="rentals-grid">
        {rentals.map((rental) => (
          <div key={rental._id} className="rental-card" style={{ background: "white", border: "1px solid #e5e7eb" }}>
            <h3 style={{ color: "#1e293b", marginBottom: "0.5rem" }}>{rental.movieTitle}</h3>
            <p><strong>Data wypożyczenia:</strong> {rental.rentalDate ? new Date(rental.rentalDate).toLocaleDateString() : "-"}</p>
            <p><strong>Planowany zwrot:</strong> {rental.plannedReturnDate ? new Date(rental.plannedReturnDate).toLocaleDateString() : "-"}</p>
            {rental.actualReturnDate && (
              <p><strong>Zwrócono:</strong> {new Date(rental.actualReturnDate).toLocaleDateString()}</p>
            )}
            {rental.status === 'pending_return' && (
              <p style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                ⏳ Oczekuje na zatwierdzenie zwrotu przez administratora
              </p>
            )}
            <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {rental.status === 'active' && (
                <button
                  className="return-btn"
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "1rem",
                    transition: "background-color 0.2s"
                  }}
                  onClick={() => handleReturn(rental)}
                >
                  🔁 Zwróć film
                </button>
              )}
              {rental.actualReturnDate && (
                <button
                  className="delete-btn"
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "1rem",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#dc2626"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#ef4444"}
                  onClick={() => handleDelete(rental)}
                >
                  🗑️ Usuń z historii
                </button>
              )}
              <span className={`status ${rental.status}`}>
                {rental.status === 'active' ? 'Aktywne' : 
                 rental.status === 'pending_return' ? 'Oczekuje na zatwierdzenie' : 
                 'Zwrócone'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
