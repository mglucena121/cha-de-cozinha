import { useEffect, useState } from 'react'
import { Gift, Loader2, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function ConfirmacaoPage() {
  const [firstName, setFirstName] = useState('')
  const [selectedGiftId, setSelectedGiftId] = useState('')
  const [presentes, setPresentes] = useState([])
  const [loadingGifts, setLoadingGifts] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const loadPresentes = async () => {
    setLoadingGifts(true)

    const { data, error } = await supabase
      .from('presentes')
      .select('id, nome, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      toast.error(`Erro ao carregar presentes: ${error.message}`)
      setPresentes([])
      setLoadingGifts(false)
      return
    }

    const giftsList = data ?? []
    setPresentes(giftsList)
    setSelectedGiftId((currentSelectedGiftId) =>
      giftsList.some((item) => item.id === currentSelectedGiftId) ? currentSelectedGiftId : '',
    )

    setLoadingGifts(false)
  }

  useEffect(() => {
    loadPresentes()

    const channel = supabase
      .channel('confirmacao-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentes' }, () => {
        loadPresentes()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleConfirm = async (event) => {
    event.preventDefault()

    const normalizedFirstName = firstName.trim()

    if (!normalizedFirstName) {
      toast.error('Informe seu primeiro nome para confirmar.')
      return
    }

    if (!selectedGiftId) {
      toast.error('Selecione um presente disponivel.')
      return
    }

    setConfirming(true)

    const { data, error } = await supabase.rpc('confirmar_presente', {
      p_primeiro_nome: normalizedFirstName,
      p_presente_id: selectedGiftId,
    })

    if (error) {
      toast.error(error.message)
      setConfirming(false)
      return
    }

    setFirstName('')
    setSelectedGiftId('')
    setConfirming(false)
    toast.success(`Presente confirmado: ${data?.presente_nome ?? 'sucesso'}!`)
    loadPresentes()
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-card fade-rise w-full max-w-2xl p-7 sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Cha de Cozinha</p>
        <h1 className="mt-1 text-4xl text-[var(--ink)]">Confirmar Presente</h1>
        <p className="mt-3 text-[var(--earth)]">
          Escolha um presente disponivel e confirme com seu primeiro nome.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleConfirm}>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--earth)]">Primeiro nome</span>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ex: Maria"
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--earth)]">
              <Gift size={16} />
              Presente disponivel
            </span>
            <select
              value={selectedGiftId}
              onChange={(event) => setSelectedGiftId(event.target.value)}
              disabled={loadingGifts || presentes.length === 0}
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)] disabled:cursor-not-allowed disabled:opacity-80"
            >
              <option value="">
                {loadingGifts ? 'Carregando presentes...' : presentes.length ? 'Selecione um presente' : 'Nenhum presente disponivel'}
              </option>
              {presentes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.28)] bg-[rgba(255,255,255,0.55)] px-4 py-3 text-sm text-[var(--earth)]">
            Atualizacao automatica: quando um presente for confirmado, ele some da lista imediatamente.
          </div>

          <button
            type="submit"
            disabled={confirming || loadingGifts || presentes.length === 0}
            className="btn-primary mt-2 inline-flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {confirming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {confirming ? 'Confirmando...' : 'Confirmar Presente'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ConfirmacaoPage
