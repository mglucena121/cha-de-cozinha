import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gift, HeartHandshake, Loader2, LogOut, Plus, RefreshCw, Search, Trash2, Users, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AddGiftModal from '../components/AddGiftModal'

function AdminPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('presentes')
  const [presentes, setPresentes] = useState([])
  const [convidadas, setConvidadas] = useState([])
  const [confirmacoes, setConfirmacoes] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [giftName, setGiftName] = useState('')
  const [savingGift, setSavingGift] = useState(false)
  const [deletingGiftId, setDeletingGiftId] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [guestWhatsapp, setGuestWhatsapp] = useState('')
  const [savingGuest, setSavingGuest] = useState(false)
  const [deletingGuestId, setDeletingGuestId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const confirmacaoBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/confirmar'
    return `${window.location.origin}/confirmar`
  }, [])

  const normalizedGiftNames = useMemo(
    () => new Set(presentes.map((item) => item.nome.trim().toLowerCase())),
    [presentes],
  )

  const filteredConfirmacoes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) return confirmacoes

    return confirmacoes.filter((item) =>
      `${item.primeiro_nome} ${item.presente_nome}`.toLowerCase().includes(normalizedSearch),
    )
  }, [confirmacoes, searchTerm])

  const confirmedGiftIds = useMemo(() => {
    return new Set(
      convidadas
        .filter((item) => item.status === 'confirmada' && item.presente_id)
        .map((item) => item.presente_id),
    )
  }, [convidadas])

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingData(true)
    }

    const [{ data: presentesData, error: presentsError }, { data: convidadasData, error: guestsError }] = await Promise.all([
      supabase.from('presentes').select('id, nome, created_at').order('created_at', { ascending: true }),
      supabase
        .from('convidadas')
        .select('id, nome, whatsapp, token, status, presente_id, created_at, presente:presentes(id, nome)')
        .order('created_at', { ascending: false }),
    ])

    if (presentsError) {
      toast.error(`Erro ao buscar presentes: ${presentsError.message}`)
    }

    if (guestsError) {
      toast.error(`Erro ao buscar convidadas: ${guestsError.message}`)
    }

    setPresentes(presentesData ?? [])
    const guestsList = convidadasData ?? []
    setConvidadas(guestsList)
    setConfirmacoes(
      guestsList
        .filter((item) => item.status === 'confirmada' && item.presente?.nome)
        .map((item) => ({
          id: item.id,
          primeiro_nome: item.nome,
          presente_nome: item.presente.nome,
          created_at: item.created_at,
        })),
    )
    if (!silent) {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('admin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentes' }, () => {
        loadData({ silent: true })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'convidadas' }, () => {
        loadData({ silent: true })
      })
      .subscribe()

    const pollingId = setInterval(() => {
      loadData({ silent: true })
    }, 12000)

    return () => {
      clearInterval(pollingId)
      supabase.removeChannel(channel)
    }
  }, [loadData])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Sessao encerrada.')
    navigate('/login', { replace: true })
  }

  const handleAddGift = async (event) => {
    event.preventDefault()

    const normalizedName = giftName.trim().toLowerCase()

    if (!normalizedName) {
      toast.error('Informe o nome do presente.')
      return
    }

    if (normalizedGiftNames.has(normalizedName)) {
      toast.error('Este presente ja esta na lista.')
      return
    }

    setSavingGift(true)

    const { data: createdGift, error } = await supabase
      .from('presentes')
      .insert({
        nome: giftName.trim(),
      })
      .select('id, nome, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        toast.error('Este presente ja existe.')
      } else {
        toast.error(error.message)
      }
      setSavingGift(false)
      return
    }

    if (createdGift) {
      setPresentes((currentPresentes) => [...currentPresentes, createdGift])
    }

    setGiftName('')
    setSavingGift(false)
    setIsModalOpen(false)
    toast.success('Presente adicionado com sucesso!')
  }

  const handleDeleteGift = async (giftId) => {
    setDeletingGiftId(giftId)

    const { error } = await supabase.from('presentes').delete().eq('id', giftId)

    if (error) {
      toast.error(error.message)
      setDeletingGiftId(null)
      return
    }

    setPresentes((currentPresentes) =>
      currentPresentes.filter((item) => item.id !== giftId),
    )

    toast.success('Presente removido da lista.')
    setDeletingGiftId(null)
  }

  const handleAddGuest = async (event) => {
    event.preventDefault()

    const normalizedName = guestName.trim()
    const normalizedWhatsapp = guestWhatsapp.replace(/\D/g, '')

    if (!normalizedName) {
      toast.error('Informe o nome da convidada.')
      return
    }

    if (!normalizedWhatsapp) {
      toast.error('Informe o WhatsApp com DDD.')
      return
    }

    if (normalizedWhatsapp.length < 10 || normalizedWhatsapp.length > 11) {
      toast.error('Use um WhatsApp valido com DDD (10 ou 11 digitos).')
      return
    }

    setSavingGuest(true)

    const { data: createdGuest, error } = await supabase
      .from('convidadas')
      .insert([{ nome: normalizedName, whatsapp: normalizedWhatsapp }])
      .select('id, nome, whatsapp, token, status, presente_id, created_at, presente:presentes(id, nome)')
      .single()

    if (error) {
      toast.error(error.message)
      setSavingGuest(false)
      return
    }

    if (createdGuest) {
      setConvidadas((currentGuests) => [createdGuest, ...currentGuests])
    }

    setGuestName('')
    setGuestWhatsapp('')
    setSavingGuest(false)
    toast.success('Convidada cadastrada com sucesso!')
  }

  const handleDeleteGuest = async (guestId) => {
    setDeletingGuestId(guestId)

    const { error } = await supabase.from('convidadas').delete().eq('id', guestId)

    if (error) {
      toast.error(error.message)
      setDeletingGuestId(null)
      return
    }

    setConvidadas((currentGuests) => currentGuests.filter((item) => item.id !== guestId))
    setConfirmacoes((currentConfirmacoes) => currentConfirmacoes.filter((item) => item.id !== guestId))
    toast.success('Convidada removida da lista.')
    setDeletingGuestId(null)
  }

  const buildInviteLink = useCallback((token) => `${confirmacaoBaseUrl}?token=${token}`, [confirmacaoBaseUrl])

  const handleSendInvite = useCallback(
    (guest) => {
      const normalizedWhatsapp = guest.whatsapp.replace(/\D/g, '')

      if (!normalizedWhatsapp) {
        toast.error('WhatsApp invalido para envio do convite.')
        return
      }

      if (!guest.token) {
        toast.error('Token de convite nao encontrado para esta convidada.')
        return
      }

      const inviteLink = buildInviteLink(guest.token)
      const message = `Ola, ${guest.nome}! 🎉\nVoce esta convidada para o nosso Cha de Cozinha!\nClique no link para confirmar sua presenca e escolher seu presente:\n\n👉 ${inviteLink}\n\nMal podemos esperar para celebrar com voce! 💕`
      const waUrl = `https://wa.me/55${normalizedWhatsapp}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    },
    [buildInviteLink],
  )

  const formatWhatsapp = useCallback((whatsapp) => {
    const digits = whatsapp.replace(/\D/g, '')

    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }

    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }

    return digits
  }, [])

  return (
    <main className="app-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[rgba(176,137,104,0.28)] bg-[linear-gradient(120deg,rgba(255,255,252,0.98),rgba(252,248,242,0.94))] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2">
            <Gift size={14} className="text-gold" />
            <span className="font-serif text-xl text-wine">Chá de Cozinha</span>
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('presentes')}
              className={`group font-sans inline-flex items-center gap-3 rounded-full px-6 py-2 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                activeSection === 'presentes'
                  ? 'border border-[rgba(214,176,106,0.55)] bg-[rgba(161, 38, 38, 0.94)] text-wine shadow-[0_4px_12px_rgba(84,52,38,0.08)]'
                  : 'bg-transparent text-[var(--earth)] hover:bg-[rgba(120,53,34,0.14)] hover:text-[rgb(98,43,28)]'
              }`}
            >
              <Gift size={15} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Lista de Presentes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('confirmacoes')}
              className={`group font-sans inline-flex items-center gap-3 rounded-full px-6 py-2 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                activeSection === 'confirmacoes'
                  ? 'border border-[rgba(214,176,106,0.55)] bg-[rgba(255,255,255,0.94)] text-wine shadow-[0_4px_12px_rgba(84,52,38,0.08)]'
                  : 'bg-transparent text-[var(--earth)] hover:bg-[rgba(120,53,34,0.14)] hover:text-[rgb(98,43,28)]'
              }`}
            >
              <HeartHandshake size={15} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Confirmações</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('convidadas')}
              className={`group font-sans inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                activeSection === 'convidadas'
                  ? 'border border-[rgba(214,176,106,0.55)] bg-[rgba(255,255,255,0.94)] text-wine shadow-[0_4px_12px_rgba(84,52,38,0.08)]'
                  : 'bg-transparent text-[var(--earth)] hover:bg-[rgba(120,53,34,0.14)] hover:text-[rgb(98,43,28)]'
              }`}
            >
              <Users size={15} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Lista de Convidados</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 inline-flex items-center gap-2 rounded-full px-3 py-2 font-sans text-sm font-semibold uppercase tracking-wider text-[rgb(120,53,34)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(120,53,34,0.14)] hover:text-[rgb(98,43,28)]"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {activeSection === 'presentes' ? (
          <section className="animate-fade-up rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-4xl text-wine">Lista de Presentes</h1>
                <div className="gold-divider mt-3 w-28" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {presentes.length} presente{presentes.length !== 1 && 's'} • {confirmacoes.length} confirmado{confirmacoes.length !== 1 && 's'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="rounded-full border border-border bg-card px-3 py-3 text-muted-foreground transition hover:text-wine"
                  aria-label="Atualizar dados"
                >
                  <RefreshCw size={16} />
                </button>

                <button type="button" onClick={() => setIsModalOpen(true)} className="font-sans inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground elegant-shadow transition hover:opacity-90">
                  <Plus size={18} />
                  Adicionar presente
                </button>
              </div>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : presentes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm text-muted-foreground">Nenhum presente cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presentes.map((item) => {
                  const isConfirmed = confirmedGiftIds.has(item.id)

                  return (
                  <article
                    key={item.id}
                    className={`group rounded-2xl border bg-card p-5 elegant-shadow transition ${
                      isConfirmed
                        ? 'border-[rgba(60,138,86,0.35)] hover:border-[rgba(60,138,86,0.5)]'
                        : 'border-border hover:border-gold/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-2xl text-wine">{item.nome}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteGift(item.id)}
                        disabled={deletingGiftId === item.id}
                        className="rounded-full p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive disabled:cursor-not-allowed"
                        aria-label={`Excluir ${item.nome}`}
                      >
                        {deletingGiftId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${isConfirmed ? 'bg-[rgb(52,112,72)]' : 'bg-gold'}`} />
                      <span className={`text-[10px] uppercase tracking-[0.2em] ${isConfirmed ? 'text-[rgb(52,112,72)]' : 'text-muted-foreground'}`}>
                        {isConfirmed ? 'Confirmado' : 'Aguardando'}
                      </span>
                    </div>
                  </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : activeSection === 'confirmacoes' ? (
          <section className="animate-fade-up">
            <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h1 className="font-serif text-4xl text-wine">Confirmacoes</h1>
                <div className="gold-divider mt-3 w-32" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {confirmacoes.length} pessoa{confirmacoes.length !== 1 && 's'} confirmaram presenca.
                </p>
              </div>

              <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
                <Search size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar nome ou presente"
                  className="w-full bg-transparent text-[var(--ink)] outline-none placeholder:text-muted-foreground md:min-w-[240px]"
                />
              </label>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Presentes ativos</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{presentes.length}</p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Confirmacoes</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{confirmacoes.length}</p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Resultado busca</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{filteredConfirmacoes.length}</p>
              </article>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : confirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm text-muted-foreground">Ainda nao ha confirmacoes.</p>
              </div>
            ) : filteredConfirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm text-muted-foreground">Nenhum resultado para essa busca.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredConfirmacoes.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-5 elegant-shadow transition hover:border-gold/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-secondary font-serif text-wine">
                        {item.primeiro_nome?.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-serif text-lg text-wine">{item.primeiro_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.created_at && new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="gold-divider my-4" />

                    <div className="flex items-center gap-2 text-sm">
                      <Gift size={16} className="text-gold" />
                      <span className="truncate text-[var(--ink)]">{item.presente_nome}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="animate-fade-up rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <article className="rounded-2xl border border-border bg-card p-4">
                <h2 className="font-serif text-3xl text-wine">Lista de Convidados</h2>
                <p className="mt-1 text-muted-foreground">Cadastre convidadas, envie o convite unico e acompanhe o status.</p>
                <p className="mt-3 text-sm text-muted-foreground">Total cadastradas: <strong className="text-[var(--ink)]">{convidadas.length}</strong></p>
              </article>

              <form onSubmit={handleAddGuest} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Nova convidada</p>
                <div className="mt-3 grid gap-3">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Nome completo"
                    className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-[var(--ink)] outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={guestWhatsapp}
                    onChange={(event) => setGuestWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="WhatsApp com DDD (somente numeros)"
                    className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-[var(--ink)] outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                  />
                  <button type="submit" disabled={savingGuest} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-70">
                    {savingGuest ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {savingGuest ? 'Salvando...' : 'Cadastrar convidada'}
                  </button>
                </div>
              </form>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : convidadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma convidada cadastrada ainda.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {convidadas.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border bg-card p-5 elegant-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl text-wine">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">{formatWhatsapp(item.whatsapp)}</p>
                      </div>

                      <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] ${
                        item.status === 'confirmada'
                          ? 'bg-[rgba(60,138,86,0.15)] text-[rgb(52,112,72)]'
                          : 'bg-[rgba(179,90,60,0.12)] text-[var(--rust)]'
                      }`}>
                        {item.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleSendInvite(item)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(60,138,86,0.3)] px-4 py-2.5 text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.1)]"
                      >
                        <MessageCircle size={16} />
                        Enviar convite
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGuest(item.id)}
                        disabled={deletingGuestId === item.id}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(179,90,60,0.32)] px-4 py-2.5 text-[var(--rust)] transition hover:bg-[rgba(179,90,60,0.08)] disabled:cursor-not-allowed"
                      >
                        {deletingGuestId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <AddGiftModal
        isOpen={isModalOpen}
        giftName={giftName}
        onGiftNameChange={setGiftName}
        onClose={() => {
          if (savingGift) return
          setIsModalOpen(false)
          setGiftName('')
        }}
        onSubmit={handleAddGift}
        loading={savingGift}
      />
    </main>
  )
}

export default AdminPage
