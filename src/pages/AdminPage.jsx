import { Gift, HeartHandshake, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function AdminPage() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Sessao encerrada.')
    navigate('/login', { replace: true })
  }

  return (
    <main className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="glass-card fade-rise flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Dashboard</p>
            <h1 className="text-3xl text-[var(--ink)] sm:text-4xl">Administracao do Cha</h1>
          </div>

          <button type="button" onClick={handleLogout} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3">
            <LogOut size={18} />
            Sair
          </button>
        </header>

        <nav className="glass-card fade-rise grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <button
            type="button"
            className="rounded-2xl border border-[rgba(140,100,74,0.16)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-left text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[rgba(179,90,60,0.4)]"
          >
            <span className="inline-flex items-center gap-2 text-lg"><Gift size={18} /> Lista de Presentes</span>
          </button>
          <button
            type="button"
            className="rounded-2xl border border-[rgba(140,100,74,0.16)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-left text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[rgba(179,90,60,0.4)]"
          >
            <span className="inline-flex items-center gap-2 text-lg"><HeartHandshake size={18} /> Confirmacoes</span>
          </button>
        </nav>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="glass-card fade-rise p-6">
            <h2 className="text-2xl text-[var(--ink)]">Lista de Presentes</h2>
            <p className="mt-2 text-[var(--earth)]">
              Etapa 2: aqui entraremos com CRUD de presentes via Supabase e modal elegante para adicao.
            </p>
          </article>

          <article className="glass-card fade-rise p-6">
            <h2 className="text-2xl text-[var(--ink)]">Confirmacoes</h2>
            <p className="mt-2 text-[var(--earth)]">
              Etapa 3: aqui exibiremos nome + presente escolhido com atualizacao automatica em cards.
            </p>
          </article>
        </section>
      </div>
    </main>
  )
}

export default AdminPage
