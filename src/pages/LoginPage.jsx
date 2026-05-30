import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
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
    <div className="min-h-screen flex items-center justify-center px-5 py-8 md:py-12">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="bg-card border border-border rounded-3xl elegant-shadow p-7 sm:p-8 md:p-10 flex flex-col">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-gold mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="font-serif text-xs uppercase tracking-[0.3em] text-wine">área da noiva</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-[2.1rem] md:text-4xl font-serif text-wine leading-tight">
              {mode === 'signin' ? 'Bem-vinda' : 'Criar conta'}
            </h1>
            <div className="gold-divider my-5 mx-auto w-24" />
            <p className="font-sans text-base md:text-lg text-[color:var(--foreground)] max-w-sm mx-auto leading-relaxed opacity-80">
              {mode === 'signin'
                ? 'Entre para gerenciar sua lista de presentes.'
                : 'Crie sua conta de administradora.'}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-7">
              <div>
                <label className="font-sans text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)] opacity-75 mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-sans w-full pl-11 pr-4 py-4 text-base md:text-lg rounded-3xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-90 transition"
                    placeholder="voce@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)] opacity-75 mb-2 block">
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-sans w-full pl-11 pr-4 py-4 text-base md:text-lg rounded-3xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-90 transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="font-sans w-full inline-flex items-center justify-center gap-2 rounded-3xl bg-primary py-3 text-base md:text-lg font-semibold tracking-wide text-primary-foreground elegant-shadow hover:opacity-90 disabled:opacity-60 transition"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}

export default LoginPage
