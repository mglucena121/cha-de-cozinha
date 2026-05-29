import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) return

      if (!error && data.session) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }

      setLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session))
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <main className="app-shell flex items-center justify-center px-4 py-10">
        <div className="glass-card fade-rise w-full max-w-md p-8 text-center">
          <p className="text-lg text-[var(--earth)]">Carregando area administrativa...</p>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
