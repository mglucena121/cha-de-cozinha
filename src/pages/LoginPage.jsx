import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn, Mail, LockKeyhole } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyLogged, setAlreadyLogged] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAlreadyLogged(true)
    })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      toast.error('Preencha email e senha.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Login realizado com sucesso!')
    navigate('/admin', { replace: true })
  }

  if (alreadyLogged) {
    return <Navigate to="/admin" replace />
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-card fade-rise w-full max-w-md p-7 sm:p-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-[var(--gold)]">
          Cha de Cozinha
        </p>
        <h1 className="text-4xl leading-tight text-[var(--ink)]">Painel da Noiva</h1>
        <p className="mt-2 text-base text-[var(--earth)]">Entre para gerenciar presentes e confirmacoes.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--earth)]">
              <Mail size={16} />
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--earth)]">
              <LockKeyhole size={16} />
              Senha
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)]"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-primary inline-flex w-full items-center justify-center gap-2">
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
