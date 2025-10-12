import { useState } from 'react'

export default function LoginForm({ onLogin, switchToRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // TODO: Wywołanie API do logowania
      console.log('Logowanie:', formData)
      
      // Symulacja wywołania API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onLogin) {
        onLogin(formData)
      }
    } catch (err) {
      setError('Błąd logowania: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-form">
      <h2>Logowanie</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Wprowadź swój email"
          />
        </div>

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

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </form>

      <p className="switch-form">
        Nie masz konta? 
        <button 
          type="button" 
          className="link-btn" 
          onClick={switchToRegister}
        >
          Zarejestruj się
        </button>
      </p>
    </div>
  )
}