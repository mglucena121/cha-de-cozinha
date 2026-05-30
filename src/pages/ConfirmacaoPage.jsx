import { useCallback, useEffect, useState } from 'react'
import { Gift, Loader2, Send, CircleAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { supabase, setInviteTokenHeader } from '../lib/supabase'

function ConfirmacaoPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [convidada, setConvidada] = useState(null)
  const [selectedGiftId, setSelectedGiftId] = useState('')
  const [presentes, setPresentes] = useState([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const loadInviteData = useCallback(async ({ silent = false } = {}) => {
    if (!token) {
      setConvidada(null)
      setPresentes([])
      setSelectedGiftId('')
      setLoadingPage(false)
      return
    }

    if (!silent) {
      setLoadingPage(true)
    }

    const [{ data: convidadaData, error: convidadaError }, { data: giftsData, error: giftsError }] = await Promise.all([
      supabase.from('convidadas').select('id, nome, status, presente_id, token').eq('token', token).single(),
      supabase.from('presentes').select('id, nome, created_at').order('created_at', { ascending: true }),
    ])

    if (convidadaError) {
      if (convidadaError.code !== 'PGRST116') {
        toast.error(`Erro ao carregar convite: ${convidadaError.message}`)
      }
      setConvidada(null)
      setPresentes([])
      setSelectedGiftId('')
      if (!silent) {
        setLoadingPage(false)
      }
      return
    }

    if (giftsError) {
      toast.error(`Erro ao carregar presentes: ${giftsError.message}`)
      setPresentes([])
      if (!silent) {
        setLoadingPage(false)
      }
      return
    }

    const giftsList = giftsData ?? []

    setConvidada(convidadaData)
    setPresentes(giftsList)
    setSelectedGiftId((currentSelectedGiftId) => {
      if (currentSelectedGiftId && giftsList.some((item) => item.id === currentSelectedGiftId)) {
        return currentSelectedGiftId
      }
      return convidadaData.presente_id ?? ''
    })

    if (!silent) {
      setLoadingPage(false)
    }
  }, [token])

  useEffect(() => {
    setInviteTokenHeader(token)
    loadInviteData()

    const channel = supabase
      .channel(`confirmacao-live-updates-${token || 'sem-token'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentes' }, () => {
        loadInviteData({ silent: true })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'convidadas' }, () => {
        loadInviteData({ silent: true })
      })
      .subscribe()

    const pollingId = setInterval(() => {
      loadInviteData({ silent: true })
    }, 10000)

    return () => {
      clearInterval(pollingId)
      supabase.removeChannel(channel)
      setInviteTokenHeader(null)
    }
  }, [loadInviteData, token])

  const handleConfirm = async (event) => {
    event.preventDefault()

    if (!convidada) {
      toast.error('Convite nao encontrado.')
      return
    }

    if (!selectedGiftId) {
      toast.error('Selecione um presente disponivel.')
      return
    }

    setConfirming(true)

    const { error } = await supabase
      .from('convidadas')
      .update({ status: 'confirmada', presente_id: selectedGiftId })
      .eq('token', token)

    if (error) {
      if (error.code === '23505') {
        toast.error('Este presente acabou de ser escolhido por outra convidada. Tente outro item.')
      } else {
        toast.error(error.message)
      }
      setConfirming(false)
      loadInviteData({ silent: true })
      return
    }

    setConvidada((current) => (current ? { ...current, status: 'confirmada', presente_id: selectedGiftId } : current))
    setConfirming(false)
    toast.success('Presenca confirmada com sucesso!')
    loadInviteData({ silent: true })
  }

  if (loadingPage) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
        <section className="glass-card fade-rise w-full max-w-2xl p-7 text-center sm:p-10">
          <p className="inline-flex items-center gap-2 text-[var(--earth)]"><Loader2 size={18} className="animate-spin" /> Carregando convite...</p>
        </section>
      </main>
    )
  }

  if (!convidada) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
        <section className="glass-card fade-rise w-full max-w-2xl p-7 sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Cha de Cozinha</p>
          <h1 className="mt-1 text-4xl text-[var(--ink)]">Convite nao encontrado</h1>
          <p className="mt-3 inline-flex items-center gap-2 text-[var(--earth)]">
            <CircleAlert size={18} />
            Verifique o link recebido no WhatsApp e tente novamente.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass-card fade-rise w-full max-w-2xl p-7 sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Cha de Cozinha</p>
        <h1 className="mt-1 text-4xl text-[var(--ink)]">Confirme sua Presenca</h1>
        <p className="mt-3 text-[var(--earth)]">
          Ola, <strong className="text-[var(--ink)]">{convidada.nome}</strong>! Escolha um presente disponivel para concluir sua confirmacao.
        </p>

        <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] ${
          convidada.status === 'confirmada'
            ? 'bg-[rgba(60,138,86,0.15)] text-[rgb(52,112,72)]'
            : 'bg-[rgba(179,90,60,0.12)] text-[var(--rust)]'
        }`}>
          {convidada.status === 'confirmada' ? 'Status atual: confirmada' : 'Status atual: pendente'}
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleConfirm}>
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm text-[var(--earth)]">
              <Gift size={16} />
              Presente disponivel
            </span>
            <select
              value={selectedGiftId}
              onChange={(event) => setSelectedGiftId(event.target.value)}
              disabled={presentes.length === 0}
              className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)] disabled:cursor-not-allowed disabled:opacity-80"
            >
              <option value="">
                {presentes.length ? 'Selecione um presente' : 'Nenhum presente disponivel'}
              </option>
              {presentes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.28)] bg-[rgba(255,255,255,0.55)] px-4 py-3 text-sm text-[var(--earth)]">
            Se outro convite escolher o mesmo presente antes, voce vera uma mensagem para selecionar outro item.
          </div>

          <button
            type="submit"
            disabled={confirming || presentes.length === 0}
            className="btn-primary mt-2 inline-flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {confirming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {confirming ? 'Confirmando...' : 'Confirmar Presenca'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ConfirmacaoPage
