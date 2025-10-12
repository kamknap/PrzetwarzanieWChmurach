import { useState } from 'react'

export default function RegisterForm({ onRegister, switchToLogin }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    phone: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne')
      return false
    }
    
    if (formData.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return false
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Imię i nazwisko są wymagane')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Przygotowanie danych do wysłania (bez confirmPassword)
      const { confirmPassword, ...dataToSend } = formData
      const registrationData = {
        ...dataToSend,
        role: 'user', // domyślna rola
        registrationDate: new Date().toISOString(),
        activeRentalsCount: 0
      }

      // TODO: Wywołanie API do rejestracji
      console.log('Rejestracja:', registrationData)
      
      // Symulacja wywołania API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (onRegister) {
        onRegister(registrationData)
      }
    } catch (err) {
      setError('Błąd rejestracji: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-form">
      <h2>Rejestracja</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
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
              placeholder="Wprowadź imię"
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
              placeholder="Wprowadź nazwisko"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Wprowadź adres email"
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
            placeholder="Wprowadź adres (opcjonalne)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Telefon:</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Wprowadź numer telefonu (opcjonalne)"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Wprowadź hasło"
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
              required
              placeholder="Potwierdź hasło"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
        </button>
      </form>

      <p className="switch-form">
        Masz już konto? 
        <button 
          type="button" 
          className="link-btn" 
          onClick={switchToLogin}
        >
          Zaloguj się
        </button>
      </p>
    </div>
  )
}