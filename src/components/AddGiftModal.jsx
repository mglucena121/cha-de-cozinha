import { Loader2, Plus, X } from 'lucide-react'

function AddGiftModal({ isOpen, giftName, onGiftNameChange, onClose, onSubmit, loading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(47,30,22,0.35)] px-4">
      <div className="glass-card fade-rise w-full max-w-md p-6 sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">Lista de Presentes</p>
            <h3 className="text-2xl text-[var(--ink)]">Adicionar Presente</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgba(140,100,74,0.2)] p-2 text-[var(--earth)] transition hover:bg-[rgba(255,255,255,0.6)]"
            aria-label="Fechar modal"
          >
            <X size={16} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--earth)]">Nome do presente</span>
            <input
              autoFocus
              type="text"
              value={giftName}
              onChange={(event) => onGiftNameChange(event.target.value)}
              placeholder="Ex: Air Fryer"
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.24)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)]"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[rgba(140,100,74,0.3)] px-5 py-2.5 text-[var(--earth)] transition hover:bg-[rgba(255,255,255,0.65)]"
            >
              Cancelar
            </button>

            <button type="submit" disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5">
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
              {loading ? 'Salvando...' : 'Salvar presente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddGiftModal
