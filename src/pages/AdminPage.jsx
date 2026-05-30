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

        <nav className="glass-card fade-rise grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <button
            type="button"
            onClick={() => setActiveSection('presentes')}
            className={`rounded-2xl border px-4 py-3 text-left text-[var(--ink)] transition hover:-translate-y-0.5 ${
              activeSection === 'presentes'
                ? 'border-[rgba(179,90,60,0.5)] bg-[rgba(255,252,247,0.95)] shadow-[0_8px_20px_rgba(93,58,42,0.08)]'
                : 'border-[rgba(140,100,74,0.16)] bg-[rgba(255,252,247,0.88)] hover:border-[rgba(179,90,60,0.4)]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-lg"><Gift size={18} /> Lista de Presentes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('confirmacoes')}
            className={`rounded-2xl border px-4 py-3 text-left text-[var(--ink)] transition hover:-translate-y-0.5 ${
              activeSection === 'confirmacoes'
                ? 'border-[rgba(179,90,60,0.5)] bg-[rgba(255,252,247,0.95)] shadow-[0_8px_20px_rgba(93,58,42,0.08)]'
                : 'border-[rgba(140,100,74,0.16)] bg-[rgba(255,252,247,0.88)] hover:border-[rgba(179,90,60,0.4)]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-lg"><HeartHandshake size={18} /> Confirmacoes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('convidadas')}
            className={`rounded-2xl border px-4 py-3 text-left text-[var(--ink)] transition hover:-translate-y-0.5 ${
              activeSection === 'convidadas'
                ? 'border-[rgba(179,90,60,0.5)] bg-[rgba(255,252,247,0.95)] shadow-[0_8px_20px_rgba(93,58,42,0.08)]'
                : 'border-[rgba(140,100,74,0.16)] bg-[rgba(255,252,247,0.88)] hover:border-[rgba(179,90,60,0.4)]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-lg"><Users size={18} /> Lista de Convidados</span>
          </button>
        </nav>

        {activeSection === 'presentes' ? (
          <section className="glass-card fade-rise p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl text-[var(--ink)] sm:text-3xl">Lista de Presentes</h2>
                <p className="text-[var(--earth)]">Adicione, visualize e remova itens da lista oficial.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="rounded-full border border-[rgba(140,100,74,0.26)] bg-[rgba(255,255,255,0.62)] p-3 text-[var(--earth)] transition hover:bg-[rgba(255,255,255,0.85)]"
                  aria-label="Atualizar dados"
                >
                  <RefreshCw size={16} />
                </button>

                <button type="button" onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3">
                  <Plus size={18} />
                  Novo presente
                </button>
              </div>
            </div>

            {loadingData ? (
              <div className="rounded-2xl border border-[rgba(140,100,74,0.16)] bg-[rgba(255,255,255,0.64)] p-8 text-center">
                <p className="inline-flex items-center gap-2 text-[var(--earth)]"><Loader2 size={18} className="animate-spin" /> Carregando presentes...</p>
              </div>
            ) : presentes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.32)] bg-[rgba(255,255,255,0.54)] p-8 text-center text-[var(--earth)]">
                Nenhum presente cadastrado ainda.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {presentes.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[rgba(140,100,74,0.2)] bg-[rgba(255,252,247,0.9)] p-4 shadow-[0_6px_18px_rgba(84,52,38,0.08)] transition hover:-translate-y-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl text-[var(--ink)]">{item.nome}</p>
                      <button
                        type="button"
                        onClick={() => handleDeleteGift(item.id)}
                        disabled={deletingGiftId === item.id}
                        className="rounded-full border border-[rgba(179,90,60,0.36)] p-2 text-[var(--rust)] transition hover:bg-[rgba(179,90,60,0.08)] disabled:cursor-not-allowed"
                        aria-label={`Excluir ${item.nome}`}
                      >
                        {deletingGiftId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : activeSection === 'confirmacoes' ? (
          <section className="glass-card fade-rise p-5 sm:p-6">
            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 className="text-2xl text-[var(--ink)] sm:text-3xl">Confirmacoes</h2>
                <p className="text-[var(--earth)]">Visualize quem ja confirmou e qual presente escolheu.</p>
              </div>

              <label className="flex items-center gap-2 rounded-full border border-[rgba(140,100,74,0.24)] bg-[rgba(255,255,255,0.7)] px-4 py-2.5">
                <Search size={16} className="text-[var(--earth)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar nome ou presente"
                  className="w-full bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--earth-soft)] md:min-w-[240px]"
                />
              </label>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-[rgba(140,100,74,0.18)] bg-[rgba(255,252,247,0.88)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Presentes ativos</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{presentes.length}</p>
              </article>

              <article className="rounded-2xl border border-[rgba(140,100,74,0.18)] bg-[rgba(255,252,247,0.88)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Confirmacoes</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{confirmacoes.length}</p>
              </article>

              <article className="rounded-2xl border border-[rgba(140,100,74,0.18)] bg-[rgba(255,252,247,0.88)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Resultado busca</p>
                <p className="mt-1 text-3xl text-[var(--ink)]">{filteredConfirmacoes.length}</p>
              </article>
            </div>

            {loadingData ? (
              <div className="rounded-2xl border border-[rgba(140,100,74,0.16)] bg-[rgba(255,255,255,0.64)] p-8 text-center">
                <p className="inline-flex items-center gap-2 text-[var(--earth)]"><Loader2 size={18} className="animate-spin" /> Carregando confirmacoes...</p>
              </div>
            ) : confirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.32)] bg-[rgba(255,255,255,0.54)] p-8 text-center text-[var(--earth)]">
                Ainda nao ha confirmacoes.
              </div>
            ) : filteredConfirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.32)] bg-[rgba(255,255,255,0.54)] p-8 text-center text-[var(--earth)]">
                Nenhum resultado para essa busca.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredConfirmacoes.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[rgba(140,100,74,0.2)] bg-[rgba(255,252,247,0.9)] p-4 shadow-[0_6px_18px_rgba(84,52,38,0.08)] transition hover:-translate-y-0.5">
                    <p className="text-xl text-[var(--ink)]">{item.primeiro_nome}</p>
                    <p className="mt-1 text-[var(--earth)]">{item.presente_nome}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="glass-card fade-rise p-5 sm:p-6">
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <article className="rounded-2xl border border-[rgba(140,100,74,0.18)] bg-[rgba(255,252,247,0.88)] p-4">
                <h2 className="text-2xl text-[var(--ink)] sm:text-3xl">Lista de Convidados</h2>
                <p className="mt-1 text-[var(--earth)]">Cadastre convidadas, envie o convite unico e acompanhe o status.</p>
                <p className="mt-3 text-sm text-[var(--earth)]">Total cadastradas: <strong className="text-[var(--ink)]">{convidadas.length}</strong></p>
              </article>

              <form onSubmit={handleAddGuest} className="rounded-2xl border border-[rgba(140,100,74,0.18)] bg-[rgba(255,252,247,0.88)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold)]">Nova convidada</p>
                <div className="mt-3 grid gap-3">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Nome completo"
                    className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)]"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={guestWhatsapp}
                    onChange={(event) => setGuestWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="WhatsApp com DDD (somente numeros)"
                    className="w-full rounded-2xl border border-[rgba(140,100,74,0.22)] bg-[rgba(255,252,247,0.88)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--rust)] focus:ring-2 focus:ring-[rgba(179,90,60,0.2)]"
                  />
                  <button type="submit" disabled={savingGuest} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-70">
                    {savingGuest ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {savingGuest ? 'Salvando...' : 'Cadastrar convidada'}
                  </button>
                </div>
              </form>
            </div>

            {loadingData ? (
              <div className="rounded-2xl border border-[rgba(140,100,74,0.16)] bg-[rgba(255,255,255,0.64)] p-8 text-center">
                <p className="inline-flex items-center gap-2 text-[var(--earth)]"><Loader2 size={18} className="animate-spin" /> Carregando convidadas...</p>
              </div>
            ) : convidadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.32)] bg-[rgba(255,255,255,0.54)] p-8 text-center text-[var(--earth)]">
                Nenhuma convidada cadastrada ainda.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {convidadas.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[rgba(140,100,74,0.2)] bg-[rgba(255,252,247,0.9)] p-4 shadow-[0_6px_18px_rgba(84,52,38,0.08)] transition hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl text-[var(--ink)]">{item.nome}</p>
                        <p className="text-sm text-[var(--earth)]">{formatWhatsapp(item.whatsapp)}</p>
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
