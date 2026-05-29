import { Gift, Send } from 'lucide-react'

function ConfirmacaoPage() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-card fade-rise w-full max-w-2xl p-7 sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Cha de Cozinha</p>
        <h1 className="mt-1 text-4xl text-[var(--ink)]">Confirmar Presente</h1>
        <p className="mt-3 text-[var(--earth)]">
          Etapa 2: conectaremos esta tela ao Supabase para permitir confirmar um presente sem duplicidade.
        </p>

        <form className="mt-8 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--earth)]">Primeiro nome</span>
            <input
              type="text"
              placeholder="Ex: Maria"
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--earth)]">
              <Gift size={16} />
              Presente disponivel
            </span>
            <select className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none">
              <option>Air Fryer</option>
              <option>Liquidificador</option>
              <option>Jogo de panelas</option>
            </select>
          </label>

          <button type="button" className="btn-primary mt-2 inline-flex items-center justify-center gap-2">
            <Send size={18} />
            Confirmar Presente
          </button>
        </form>
      </section>
    </main>
  )
}

export default ConfirmacaoPage
