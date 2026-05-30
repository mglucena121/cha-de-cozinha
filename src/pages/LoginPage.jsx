import { useEffect, useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { Mail, LockKeyhole, Sparkles, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
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

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + '/admin' },
        })
        if (error) throw error
        toast.success('Conta criada! Voce ja pode entrar.')
        setMode('signin')
        setEmail('')
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        toast.success('Bem-vinda de volta!')
        navigate('/admin', { replace: true })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (alreadyLogged) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="block text-center mb-6 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-wine transition">
          ← voltar
        </Link>

        <div className="bg-card border border-border rounded-2xl elegant-shadow p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-gold mb-3">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-wine">area da noiva</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-3xl font-serif text-wine">
              {mode === 'signin' ? 'Bem-vinda' : 'Criar conta'}
            </h1>
            <div className="gold-divider my-4 mx-auto w-24" />
            <p className="text-sm text-muted-foreground">
              {mode === 'signin'
                ? 'Entre para gerenciar sua lista de presentes.'
                : 'Crie sua conta de administradora.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition"
                  placeholder="voce@email.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium tracking-wide text-primary-foreground elegant-shadow hover:opacity-90 disabled:opacity-60 transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="block w-full text-center text-xs text-muted-foreground hover:text-wine mt-6 transition"
          >
            {mode === 'signin'
              ? 'Ainda nao tem conta? Criar conta'
              : 'Ja tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
