import { useState, useEffect } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import authService from '../services/authService'
import MovieContainer from './MovieContainer'
import AccountManagement from './AccountManagement'
import ClientManagement from './ClientManagement'

export default function AuthContainer() {
  const [currentForm, setCurrentForm] = useState('login') // 'login' lub 'register'
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAccountManagement, setShowAccountManagement] = useState(false)
  const [showClientManagement, setShowClientManagement] = useState(false)



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

  const handleAccountUpdate = (updatedUser) => {
    setUser(updatedUser)
  }


  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Ładowanie...</p>
      </div>
    )
  }

  // Jeśli użytkownik zalogowany pokaż dashboard

  if (user) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Witaj, {user.firstName} {user.lastName}!</h2>
          <div className="user-info">
            <p>Email: {user.email}</p>
            <p>Rola: {user.role === 'admin' ? 'Administrator' : 'Użytkownik'}</p>
            <p>Aktywne wypożyczenia: {user.activeRentalsCount}</p>
          </div>
          <div className="header-actions">
            {user.role === 'admin' && (
              <button 
                onClick={() => setShowClientManagement(true)}
                className="admin-btn"
              >
                Zarządzanie klientami
              </button>
            )}
            <button 
              onClick={() => setShowAccountManagement(true)}
              className="action-btn"
            >
              Zarządzaj kontem
            </button>
            <button 
              onClick={handleLogout}
              className="logout-btn"
            >
              Wyloguj się
            </button>
          </div>
        </div>
        <div className="dashboard-content">
          <MovieContainer />
        </div>

        {showAccountManagement && (
          <AccountManagement 
            user={user}
            onClose={() => setShowAccountManagement(false)}
            onUpdate={handleAccountUpdate}
          />
        )}

        {showClientManagement && (
          <ClientManagement 
            onClose={() => setShowClientManagement(false)}
          />
        )}
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