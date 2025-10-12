import { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

export default function AuthContainer() {
  const [currentForm, setCurrentForm] = useState('login') // 'login' lub 'register'
  const [user, setUser] = useState(null)

  const handleLogin = (loginData) => {
    console.log('Użytkownik zalogowany:', loginData)
    // TODO: Tu będzie logika zapisu stanu użytkownika
    setUser({ email: loginData.email, isLoggedIn: true })
  }

  const handleRegister = (registerData) => {
    console.log('Użytkownik zarejestrowany:', registerData)
    // TODO: Tu będzie logika po udanej rejestracji
    // Możemy automatycznie zalogować użytkownika lub przełączyć na formularz logowania
    setCurrentForm('login')
    alert('Rejestracja zakończona pomyślnie! Możesz się teraz zalogować.')
  }

  const handleLogout = () => {
    setUser(null)
  }

  // Jeśli użytkownik jest zalogowany, pokaż dashboard
  if (user && user.isLoggedIn) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Witaj, {user.email}!</h2>
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