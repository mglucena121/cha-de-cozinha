
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ConfirmacaoPage from './pages/ConfirmacaoPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/confirmar" element={<ConfirmacaoPage />} />
      <Route path="/confirmacao" element={<Navigate to="/confirmar" replace />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/confirmar" replace />} />
    </Routes>
  )
}

export default App
