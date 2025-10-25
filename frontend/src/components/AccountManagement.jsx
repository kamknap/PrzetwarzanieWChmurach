import { useState } from 'react'
import authService from '../services/authService'

export default function AccountManagement({ user, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    address: user.address,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
  }

  const validateForm = () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('Nowe hasła nie są identyczne')
      return false
    }
    
    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('Nowe hasło musi mieć co najmniej 6 znaków')
      return false
    }

    if (formData.newPassword && !formData.currentPassword) {
      setError('Musisz podać aktualne hasło, aby zmienić hasło')
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
      // Przygotuj dane do wysłania
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address
      }

      // Dodaj dane hasła tylko jeśli użytkownik chce je zmienić
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      const result = await authService.updateProfile(updateData)
      setSuccess('Profil został zaktualizowany pomyślnie!')
      
      // Wyczyść pola hasła
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))

      if (onUpdate) {
        onUpdate(result)
      }

      // Zamknij modal po 2 sekundach
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError('Błąd aktualizacji profilu: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Zarządzanie kontem</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Dane osobowe</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Imię:</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Nazwisko:</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefon:</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Wprowadź numer telefonu"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Adres:</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Wprowadź adres"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Zmiana hasła (opcjonalnie)</h3>
            <div className="form-group">
              <label htmlFor="currentPassword">Aktualne hasło:</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Wprowadź aktualne hasło"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newPassword">Nowe hasło:</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Wprowadź nowe hasło"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Potwierdź hasło:</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Potwierdź nowe hasło"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Anuluj
            </button>
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}