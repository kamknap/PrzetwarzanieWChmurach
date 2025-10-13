import { useState, useEffect } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import authService from '../services/authService'

export default function AuthContainer() {
  const [currentForm, setCurrentForm] = useState('login') // 'login' lub 'register'
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Sprawdź czy użytkownik jest już zalogowany przy ładowaniu komponenetu
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authService.isLoggedIn()) {
        try {
          const userData = await authService.getMe()
          setUser(userData)
        } catch (error) {
          console.error('Błąd pobierania danych użytkownika:', error)
          authService.logout()
        }
      }
      setIsLoading(false)
    }

    checkAuthStatus()
  }, [])

  const handleLogin = (loginResult) => {
    console.log('Użytkownik zalogowany:', loginResult.user)
    setUser(loginResult.user)
  }

  const handleRegister = (registerResult) => {
    console.log('Użytkownik zarejestrowany:', registerResult.user)
    // Automatycznie zaloguj po rejestracji
    setUser(registerResult.user)
  }

  const handleLogout = () => {
    authService.logout()
    setUser(null)
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Ładowanie...</p>
      </div>
    )
  }

  // Jeśli użytkownik jest zalogowany, pokaż dashboard
  if (user) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Witaj, {user.firstName} {user.lastName}!</h2>
          <div className="user-info">
            <p>Email: {user.email}</p>
            <p>Rola: {user.role}</p>
            <p>Aktywne wypożyczenia: {user.activeRentalsCount}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="logout-btn"
          >
            Wyloguj się
          </button>
        </div>
        <div className="dashboard-content">
          <p>Jesteś zalogowany do systemu zarządzania filmami.</p>
          {/* Tu będzie dalsza zawartość aplikacji */}
        </div>
      </div>
    )
  }

  // Jeśli użytkownik nie jest zalogowany, pokaż formularz
  return (
    <div className="auth-container">
      {currentForm === 'login' ? (
        <LoginForm 
          onLogin={handleLogin}
          switchToRegister={() => setCurrentForm('register')}
        />
      ) : (
        <RegisterForm 
          onRegister={handleRegister}
          switchToLogin={() => setCurrentForm('login')}
        />
      )}
    </div>
  )
}