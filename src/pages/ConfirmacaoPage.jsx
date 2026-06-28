import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gift, Loader2, Send, CircleAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { createInviteClient } from '../lib/supabase'
import Pagination from '../components/admin/Pagination'

const GIFTS_PAGE_SIZE = 8

function ConfirmacaoPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const inviteClient = useMemo(() => createInviteClient(token), [token])

  const [convidada, setConvidada] = useState(null)
  const [selectedGiftId, setSelectedGiftId] = useState('')
  const [presentes, setPresentes] = useState([])
  const [reservedByGiftId, setReservedByGiftId] = useState({})
  const [loadingPage, setLoadingPage] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [giftsPage, setGiftsPage] = useState(1)

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

    const [
      { data: convidadaData, error: convidadaError },
      { data: giftsData, error: giftsError },
      { data: reservedData, error: reservedError },
    ] = await Promise.all([
      inviteClient.from('convidadas').select('id, nome, status, presente_id, token').eq('token', token).single(),
      inviteClient.from('presentes').select('id, nome, created_at').order('created_at', { ascending: true }),
      inviteClient.from('presentes_reservados').select('presente_id'),
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

    if (reservedError) {
      toast.error(`Erro ao carregar status dos presentes: ${reservedError.message}`)
    }

    const giftsList = giftsData ?? []
    const reservations = reservedData ?? []
    const nextReservedByGiftId = {}

    reservations.forEach((item) => {
      if (!item.presente_id) return
      if (item.presente_id === convidadaData?.presente_id) return
      nextReservedByGiftId[item.presente_id] = true
    })

    setConvidada(convidadaData)
    setPresentes(giftsList)
    setReservedByGiftId(nextReservedByGiftId)
    setSelectedGiftId((currentSelectedGiftId) => {
      if (convidadaData.status === 'confirmada' && convidadaData.presente_id) {
        return convidadaData.presente_id
      }
      if (currentSelectedGiftId && giftsList.some((item) => item.id === currentSelectedGiftId)) {
        return currentSelectedGiftId
      }
      return convidadaData.presente_id ?? ''
    })

    if (!silent) {
      setLoadingPage(false)
    }
  }, [inviteClient, token])

  useEffect(() => {
    loadInviteData()

    const channel = inviteClient
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
      inviteClient.removeChannel(channel)
    }
  }, [inviteClient, loadInviteData, token])

  useEffect(() => {
    setGiftsPage(1)
  }, [presentes.length])

  const paginatedPresentes = useMemo(() => {
    const start = (giftsPage - 1) * GIFTS_PAGE_SIZE
    return presentes.slice(start, start + GIFTS_PAGE_SIZE)
  }, [presentes, giftsPage])

  const giftsTotalPages = Math.max(1, Math.ceil(presentes.length / GIFTS_PAGE_SIZE))

  const handleConfirm = async (event) => {
    event.preventDefault()

    if (!convidada) {
      toast.error('Convite não encontrado.')
      return
    }

    if (!selectedGiftId) {
      toast.error('Selecione um presente disponível.')
      return
    }

    if (convidada.status === 'confirmada' && convidada.presente_id) {
      toast.success('Sua presença já está confirmada.')
      return
    }

    if (reservedByGiftId[selectedGiftId]) {
      toast.error('Este presente já foi reservado. Escolha outro item.')
      return
    }

    setConfirming(true)

    const { error } = await inviteClient
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
    toast.success('Presença confirmada com sucesso!')
    loadInviteData({ silent: true })
  }

  const isConfirmed = convidada?.status === 'confirmada' && Boolean(convidada?.presente_id)
  const confirmedGift = presentes.find((item) => item.id === convidada?.presente_id)

  if (loadingPage) {
    return (
      <main className="app-shell invite-shell flex min-h-screen items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-10">
        <section className="glass-card invite-card fade-rise w-full max-w-2xl p-7 text-center sm:p-10">
          <p className="inline-flex items-center gap-2 text-[var(--earth)]"><Loader2 size={18} className="animate-spin" /> Carregando convite...</p>
        </section>
      </main>
    )
  }

  if (!convidada) {
    return (
      <main className="app-shell invite-shell flex min-h-screen items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-10">
        <section className="glass-card invite-card fade-rise w-full max-w-2xl p-7 sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Chá de Cozinha</p>
          <h1 className="mt-1 text-4xl text-[var(--ink)]">Convite não encontrado</h1>
          <p className="mt-3 inline-flex items-center gap-2 text-[var(--earth)]">
            <CircleAlert size={18} />
            Verifique o link recebido no WhatsApp e tente novamente.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell invite-shell flex min-h-screen items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-10">
    <section className="glass-card invite-card fade-rise w-full max-w-2xl p-7 sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold)]">Chá de Cozinha</p>
        <h1 className="mt-1 text-4xl text-[var(--ink)]">{isConfirmed ? 'Presença Confirmada' : 'Confirme sua Presença'}</h1>

        {isConfirmed ? (
          <section className="mt-8 grid gap-4">
            <div className="text-[var(--earth)]">
              <p className="text-base leading-relaxed sm:text-[1.05rem]">
                Olá, <strong className="text-[var(--ink)]">{convidada.nome}</strong>! Mal podemos esperar para celebrar com você no chá de cozinha.
              </p>
            </div>

            <div>
              <span className="mb-2 inline-flex items-center gap-2 font-sans text-sm text-[var(--earth)]">
                <Gift size={16} />
                Presente selecionado
              </span>

              <div className="w-full rounded-2xl border border-[rgba(60,138,86,0.42)] bg-[rgba(60,138,86,0.12)] px-4 py-3 text-left text-[var(--ink)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-sans text-sm sm:text-base">{confirmedGift?.nome ?? 'Presente selecionado'}</span>
                  <span className="rounded-full bg-[rgba(60,138,86,0.18)] px-2.5 py-1 font-sans text-xs uppercase tracking-[0.08em] text-[rgb(52,112,72)]">
                    Reservado
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <form className="mt-8 grid gap-4" onSubmit={handleConfirm}>
            <div className="text-[var(--earth)]">
              <p className="text-base leading-relaxed sm:text-[1.05rem]">
                Olá, <strong className="text-[var(--ink)]">{convidada.nome}</strong>! Para confirmar sua presença, escolha um presente da lista abaixo.
              </p>
            </div>

            <div>
              <span className="mb-2 inline-flex items-center gap-2 font-sans text-sm text-[var(--earth)]">
                <Gift size={16} />
                Presentes disponíveis
              </span>

              {presentes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.24)] bg-[rgba(255,252,247,0.82)] px-4 py-4 text-sm text-[var(--earth)]">
                  Nenhum presente disponível no momento.
                </div>
              ) : (
                <>
                <div className="grid gap-2">
                  {paginatedPresentes.map((item) => {
                    const isSelected = selectedGiftId === item.id
                    const isReserved = Boolean(reservedByGiftId[item.id])

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isReserved}
                        onClick={() => setSelectedGiftId(item.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isReserved
                            ? 'cursor-not-allowed border-[rgba(140,100,74,0.22)] bg-[rgba(207,198,186,0.38)] text-[rgba(95,77,66,0.78)]'
                            : isSelected
                              ? 'border-[rgba(60,138,86,0.45)] bg-[rgba(60,138,86,0.12)] text-[var(--ink)]'
                              : 'border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.9)] text-[var(--ink)] hover:border-[rgba(179,90,60,0.42)] hover:bg-[rgba(255,255,255,0.96)]'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`relative inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                                isReserved
                                  ? 'border-[rgba(140,100,74,0.35)]'
                                  : isSelected
                                    ? 'border-[rgb(52,112,72)]'
                                    : 'border-[rgba(140,100,74,0.45)]'
                              }`}
                            >
                              {isSelected && !isReserved ? <span className="h-2 w-2 rounded-full bg-[rgb(52,112,72)]" /> : null}
                            </span>
                            <span className="font-sans text-sm">{item.nome}</span>
                          </div>

                          {isReserved ? (
                            <span className="rounded-full bg-[rgba(140,100,74,0.2)] px-2.5 py-1 font-sans text-xs uppercase tracking-[0.08em] text-[rgba(95,77,66,0.9)]">
                              Reservado
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <Pagination
                  page={giftsPage}
                  totalPages={giftsTotalPages}
                  totalItems={presentes.length}
                  pageSize={GIFTS_PAGE_SIZE}
                  onPageChange={setGiftsPage}
                  itemLabel="presentes"
                />
                </>
              )}
            </div>

            <div className="mt-2 border-t border-[rgba(140,100,74,0.18)] pt-4">
              <button
                type="submit"
                disabled={confirming || presentes.length === 0 || !selectedGiftId || Boolean(reservedByGiftId[selectedGiftId])}
                className="btn-primary font-sans inline-flex w-full items-center justify-center gap-2 disabled:opacity-70"
              >
                {confirming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {confirming ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}

export default ConfirmacaoPage
