import { useState, useEffect } from 'react'
import authService from '../services/authService'

export default function ClientManagement({ onClose }) {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    role: 'user'
  })
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    newPassword: '',
    role: 'user'
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const clientsData = await authService.getAllClients()
      setClients(clientsData)
    } catch (err) {
      setError('Błąd pobierania klientów: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (clientId, clientName) => {
    if (!confirm(`Czy na pewno chcesz usunąć klienta ${clientName}?`)) {
      return
    }

    try {
      await authService.deleteClient(clientId)
      setSuccess('Klient został usunięty')
      fetchClients()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Błąd usuwania klienta: ' + err.message)
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client.id)
    setEditFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone || '',
      address: client.address || '',
      newPassword: '',
      role: client.role
    })
    setShowCreateForm(false)
  }

  const handleCancelEdit = () => {
    setEditingClient(null)
    setEditFormData({
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      newPassword: '',
      role: 'user'
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (editFormData.newPassword && editFormData.newPassword.length < 6) {
      setError('Nowe hasło musi mieć co najmniej 6 znaków')
      return
    }

    try {
      const updateData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        phone: editFormData.phone,
        address: editFormData.address,
        role: editFormData.role
      }

      // Dodaj hasło tylko jeśli zostało wprowadzone
      if (editFormData.newPassword) {
        updateData.newPassword = editFormData.newPassword
      }

      await authService.updateClient(editingClient, updateData)
      setSuccess('Dane klienta zostały zaktualizowane')
      setEditingClient(null)
      fetchClients()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Błąd aktualizacji klienta: ' + err.message)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newClient.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return
    }

    try {
      await authService.createClient(newClient)
      setSuccess('Klient został utworzony')
      setShowCreateForm(false)
      setNewClient({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        address: '',
        phone: '',
        role: 'user'
      })
      fetchClients()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Błąd tworzenia klienta: ' + err.message)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewClient(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Zarządzanie klientami</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="client-management-actions">
          <button 
            onClick={() => {
              setShowCreateForm(!showCreateForm)
              setEditingClient(null)
            }}
            className="action-btn"
            disabled={editingClient !== null}
          >
            {showCreateForm ? 'Anuluj' : '+ Dodaj nowego klienta'}
          </button>
        </div>

        {showCreateForm && (
          <div className="create-client-form">
            <h3>Nowy klient</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Imię:</label>
                  <input
                    type="text"
                    name="firstName"
                    value={newClient.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nazwisko:</label>
                  <input
                    type="text"
                    name="lastName"
                    value={newClient.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={newClient.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Hasło:</label>
                <input
                  type="password"
                  name="password"
                  value={newClient.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Min. 6 znaków"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Telefon:</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newClient.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Adres:</label>
                  <input
                    type="text"
                    name="address"
                    value={newClient.address}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Rola:</label>
                <select
                  name="role"
                  value={newClient.role}
                  onChange={handleInputChange}
                >
                  <option value="user">Użytkownik</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <button type="submit" className="submit-btn">
                Utwórz klienta
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="loading-text">Ładowanie klientów...</div>
        ) : (
          <div className="clients-table-container">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Imię i nazwisko</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Rola</th>
                  <th>Aktywne wypożyczenia</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  editingClient === client.id ? (
                    <tr key={client.id} className="editing-row">
                      <td colSpan="6">
                        <form onSubmit={handleEditSubmit} className="inline-edit-form">
                          <h4>Edycja: {client.email}</h4>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Imię:</label>
                              <input
                                type="text"
                                name="firstName"
                                value={editFormData.firstName}
                                onChange={handleEditInputChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Nazwisko:</label>
                              <input
                                type="text"
                                name="lastName"
                                value={editFormData.lastName}
                                onChange={handleEditInputChange}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Telefon:</label>
                              <input
                                type="tel"
                                name="phone"
                                value={editFormData.phone}
                                onChange={handleEditInputChange}
                              />
                            </div>
                            <div className="form-group">
                              <label>Adres:</label>
                              <input
                                type="text"
                                name="address"
                                value={editFormData.address}
                                onChange={handleEditInputChange}
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Nowe hasło (opcjonalnie):</label>
                              <input
                                type="password"
                                name="newPassword"
                                value={editFormData.newPassword}
                                onChange={handleEditInputChange}
                                placeholder="Pozostaw puste aby nie zmieniać"
                              />
                            </div>
                            <div className="form-group">
                              <label>Rola:</label>
                              <select
                                name="role"
                                value={editFormData.role}
                                onChange={handleEditInputChange}
                              >
                                <option value="user">Użytkownik</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </div>
                          </div>

                          <div className="edit-actions">
                            <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                              Anuluj
                            </button>
                            <button type="submit" className="submit-btn">
                              Zapisz zmiany
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={client.id}>
                      <td>{client.firstName} {client.lastName}</td>
                      <td>{client.email}</td>
                      <td>{client.phone || '-'}</td>
                      <td>
                        <span className={`role-badge ${client.role}`}>
                          {client.role === 'admin' ? 'Admin' : 'Użytkownik'}
                        </span>
                      </td>
                      <td>{client.activeRentalsCount}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(client)}
                            className="edit-btn"
                            disabled={showCreateForm || editingClient !== null}
                          >
                            Edytuj
                          </button>
                          <button
                            onClick={() => handleDelete(client.id, `${client.firstName} ${client.lastName}`)}
                            className="delete-btn"
                            disabled={showCreateForm || editingClient !== null}
                          >
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
            
            {clients.length === 0 && (
              <div className="no-clients">
                Brak klientów w bazie danych
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}