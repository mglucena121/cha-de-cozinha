import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gift, HeartHandshake, Loader2, LogOut, Menu, X, Plus, Search, Trash2, Users, MessageCircle, Pencil, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AddGiftModal from '../components/AddGiftModal'
import GiftImportButton from '../components/PresenteImporteExcel'
import GuestImportButton from '../components/ConvidadaImporteExcel'

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
  const [editingGiftId, setEditingGiftId] = useState(null)
  const [editingGiftName, setEditingGiftName] = useState('')
  const [updatingGiftId, setUpdatingGiftId] = useState(null)
  const [deletingGiftId, setDeletingGiftId] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [guestWhatsapp, setGuestWhatsapp] = useState('')
  const [savingGuest, setSavingGuest] = useState(false)
  const [editingGuestId, setEditingGuestId] = useState(null)
  const [editingGuestName, setEditingGuestName] = useState('')
  const [editingGuestWhatsapp, setEditingGuestWhatsapp] = useState('')
  const [updatingGuestId, setUpdatingGuestId] = useState(null)
  const [editingConfirmationId, setEditingConfirmationId] = useState(null)
  const [editingConfirmationGiftId, setEditingConfirmationGiftId] = useState('')
  const [updatingConfirmationId, setUpdatingConfirmationId] = useState(null)
  const [deletingGuestId, setDeletingGuestId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false)
  const contentScrollRef = useRef(null)

  const actionButtonClass =
    'btn-primary font-sans inline-flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed'

  const confirmacaoBaseUrl = useMemo(() => {
    const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim()

    if (publicAppUrl) {
      const normalizedPublicUrl = publicAppUrl.replace(/\/+$/, '')

      if (normalizedPublicUrl.endsWith('/confirmar')) {
        return normalizedPublicUrl
      }

      if (normalizedPublicUrl.endsWith('/confirmacao')) {
        return `${normalizedPublicUrl.slice(0, -'/confirmacao'.length)}/confirmar`
      }

      return `${normalizedPublicUrl}/confirmar`
    }

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

  const assignedGiftIds = useMemo(() => {
    return new Set(
      convidadas
        .filter((item) => item.presente_id)
        .map((item) => item.presente_id),
    )
  }, [convidadas])

  const confirmedGiftIds = useMemo(() => {
    return new Set(
      convidadas
        .filter((item) => item.status === 'confirmada' && item.presente_id)
        .map((item) => item.presente_id),
    )
  }, [convidadas])

  const confirmedGuestNameByGiftId = useMemo(() => {
    return convidadas.reduce((acc, item) => {
      if (item.status !== 'confirmada' || !item.presente_id) {
        return acc
      }

      acc[item.presente_id] = item.nome
      return acc
    }, {})
  }, [convidadas])

  const pendingGiftCount = useMemo(
    () => Math.max(presentes.length - confirmedGiftIds.size, 0),
    [presentes.length, confirmedGiftIds],
  )

  const confirmedGuestCount = useMemo(
    () => convidadas.filter((item) => item.status === 'confirmada').length,
    [convidadas],
  )

  const pendingGuestCount = useMemo(
    () => Math.max(convidadas.length - confirmedGuestCount, 0),
    [convidadas.length, confirmedGuestCount],
  )

  const normalizedGuestPhones = useMemo(
    () => new Set(convidadas.map((item) => String(item.whatsapp || '').replace(/\D/g, '').trim())),
    [convidadas],
  )

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
          presente_id: item.presente.id,
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

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section)
    closeMobileMenu()

    if (section !== 'convidadas') {
      setIsGuestFormOpen(false)
    }

    requestAnimationFrame(() => {
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
      window.scrollTo(0, 0)
    })
  }, [closeMobileMenu])

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
    if (editingGiftId === giftId) {
      setEditingGiftId(null)
      setEditingGiftName('')
    }

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

  const handleImportedGifts = useCallback((importedGifts) => {
    if (!importedGifts?.length) return

    setPresentes((currentPresentes) => {
      const currentIds = new Set(currentPresentes.map((item) => item.id))
      const onlyNew = importedGifts.filter((item) => !currentIds.has(item.id))
      return [...currentPresentes, ...onlyNew]
    })
  }, [])

  const handleImportedGuests = useCallback((importedGuests) => {
    if (!importedGuests?.length) return

    setConvidadas((currentGuests) => {
      const currentIds = new Set(currentGuests.map((item) => item.id))
      const onlyNew = importedGuests.filter((item) => !currentIds.has(item.id))
      return [...onlyNew, ...currentGuests]
    })
  }, [])

  const handleStartGiftEdit = useCallback((gift) => {
    setEditingGiftId(gift.id)
    setEditingGiftName(gift.nome)
  }, [])

  const handleCancelGiftEdit = useCallback(() => {
    setEditingGiftId(null)
    setEditingGiftName('')
  }, [])

  const handleUpdateGift = useCallback(async (giftId) => {
    const normalizedName = editingGiftName.trim().toLowerCase()

    if (!normalizedName) {
      toast.error('Informe o nome do presente.')
      return
    }

    const currentGift = presentes.find((item) => item.id === giftId)

    if (!currentGift) {
      toast.error('Presente não encontrado.')
      return
    }

    if (currentGift.nome.trim().toLowerCase() === normalizedName) {
      setEditingGiftId(null)
      setEditingGiftName('')
      return
    }

    const duplicateExists = presentes.some(
      (item) => item.id !== giftId && item.nome.trim().toLowerCase() === normalizedName,
    )

    if (duplicateExists) {
      toast.error('Este presente ja esta na lista.')
      return
    }

    setUpdatingGiftId(giftId)

    const { data: updatedGift, error } = await supabase
      .from('presentes')
      .update({ nome: editingGiftName.trim() })
      .eq('id', giftId)
      .select('id, nome, created_at')
      .single()

    if (error) {
      toast.error(error.message)
      setUpdatingGiftId(null)
      return
    }

    if (updatedGift) {
      setPresentes((currentPresentes) =>
        currentPresentes.map((item) => (item.id === giftId ? updatedGift : item)),
      )
    }

    setUpdatingGiftId(null)
    setEditingGiftId(null)
    setEditingGiftName('')
    toast.success('Presente atualizado com sucesso!')
  }, [editingGiftName, presentes])

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
    setIsGuestFormOpen(false)
    toast.success('Convidada cadastrada com sucesso!')
  }

  const handleDeleteGuest = async (guestId) => {
    if (editingConfirmationId === guestId) {
      setEditingConfirmationId(null)
      setEditingConfirmationGiftId('')
    }

    if (editingGuestId === guestId) {
      setEditingGuestId(null)
      setEditingGuestName('')
      setEditingGuestWhatsapp('')
    }

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

  const handleStartGuestEdit = useCallback((guest) => {
    if (editingConfirmationId) {
      setEditingConfirmationId(null)
      setEditingConfirmationGiftId('')
    }

    setEditingGuestId(guest.id)
    setEditingGuestName(guest.nome)
    setEditingGuestWhatsapp(guest.whatsapp.replace(/\D/g, '').slice(0, 11))
  }, [editingConfirmationId])

  const handleCancelGuestEdit = useCallback(() => {
    setEditingGuestId(null)
    setEditingGuestName('')
    setEditingGuestWhatsapp('')
  }, [])

  const handleStartConfirmationEdit = useCallback((confirmation) => {
    if (editingGuestId) {
      setEditingGuestId(null)
      setEditingGuestName('')
      setEditingGuestWhatsapp('')
    }

    setEditingConfirmationId(confirmation.id)
    setEditingConfirmationGiftId(confirmation.presente_id ?? '')
  }, [editingGuestId])

  const handleCancelConfirmationEdit = useCallback(() => {
    setEditingConfirmationId(null)
    setEditingConfirmationGiftId('')
  }, [])

  const handleUpdateConfirmationGift = useCallback(async (confirmationId) => {
    const selectedGiftId = editingConfirmationGiftId

    if (!selectedGiftId) {
      toast.error('Selecione um presente para a troca.')
      return
    }

    const currentConfirmation = confirmacoes.find((item) => item.id === confirmationId)

    if (!currentConfirmation) {
      toast.error('Confirmacao nao encontrada.')
      return
    }

    if (currentConfirmation.presente_id === selectedGiftId) {
      handleCancelConfirmationEdit()
      return
    }

    const alreadyAssignedToAnotherGuest = convidadas.some(
      (item) => item.id !== confirmationId && item.presente_id === selectedGiftId,
    )

    if (alreadyAssignedToAnotherGuest) {
      toast.error('Este presente ja foi reservado por outra convidada.')
      return
    }

    setUpdatingConfirmationId(confirmationId)

    const { error } = await supabase
      .from('convidadas')
      .update({ presente_id: selectedGiftId })
      .eq('id', confirmationId)

    if (error) {
      if (error.code === '23505') {
        toast.error('Este presente ja foi reservado por outra convidada.')
      } else {
        toast.error(error.message)
      }
      setUpdatingConfirmationId(null)
      return
    }

    handleCancelConfirmationEdit()
    setUpdatingConfirmationId(null)
    toast.success('Presente da confirmacao atualizado com sucesso!')
    loadData({ silent: true })
  }, [confirmacoes, convidadas, editingConfirmationGiftId, handleCancelConfirmationEdit, loadData])

  const handleUpdateGuest = useCallback(async (guestId) => {
    const normalizedName = editingGuestName.trim()
    const normalizedWhatsapp = editingGuestWhatsapp.replace(/\D/g, '')

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

    const currentGuest = convidadas.find((item) => item.id === guestId)

    if (!currentGuest) {
      toast.error('Convidada nao encontrada.')
      return
    }

    const sameName = currentGuest.nome.trim() === normalizedName
    const sameWhatsapp = currentGuest.whatsapp.replace(/\D/g, '') === normalizedWhatsapp

    if (sameName && sameWhatsapp) {
      handleCancelGuestEdit()
      return
    }

    setUpdatingGuestId(guestId)

    const { data: updatedGuest, error } = await supabase
      .from('convidadas')
      .update({ nome: normalizedName, whatsapp: normalizedWhatsapp })
      .eq('id', guestId)
      .select('id, nome, whatsapp, token, status, presente_id, created_at, presente:presentes(id, nome)')
      .single()

    if (error) {
      toast.error(error.message)
      setUpdatingGuestId(null)
      return
    }

    if (updatedGuest) {
      setConvidadas((currentGuests) =>
        currentGuests.map((item) => (item.id === guestId ? updatedGuest : item)),
      )
      setConfirmacoes((currentConfirmacoes) =>
        currentConfirmacoes.map((item) =>
          item.id === guestId ? { ...item, primeiro_nome: updatedGuest.nome } : item,
        ),
      )
    }

    setUpdatingGuestId(null)
    handleCancelGuestEdit()
    toast.success('Convidada atualizada com sucesso!')
  }, [convidadas, editingGuestName, editingGuestWhatsapp, handleCancelGuestEdit])

  const buildInviteLink = useCallback(
    (token) => `${confirmacaoBaseUrl}?token=${encodeURIComponent(token)}`,
    [confirmacaoBaseUrl],
  )

  const getInviteWhatsappUrl = useCallback(
    (guest) => {
      const normalizedWhatsapp = guest.whatsapp.replace(/\D/g, '')

      if (!normalizedWhatsapp || !guest.token) {
        return null
      }

      const inviteLink = buildInviteLink(guest.token)
      const message = `Olá, ${guest.nome}!\nVocê está convidada para o nosso Chá de Cozinha!\nClique no link para confirmar sua presença e escolher seu presente:\n\n${inviteLink}\n\nMal podemos esperar para celebrar com você!`
      return `https://web.whatsapp.com/send?phone=55${normalizedWhatsapp}&text=${encodeURIComponent(message)}`
    },
    [buildInviteLink],
  )

  const handleInviteLinkClick = useCallback((event, guest) => {
    const normalizedWhatsapp = guest.whatsapp.replace(/\D/g, '')

    if (!normalizedWhatsapp) {
      event.preventDefault()
      toast.error('WhatsApp inválido para envio do convite.')
      return
    }

    if (!guest.token) {
      event.preventDefault()
      toast.error('Token de convite não encontrado para esta convidada.')
    }
  }, [])

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
    <main className="app-shell admin-page-shell flex h-[100dvh] flex-col overflow-hidden">
      <header className="admin-page-header fixed left-0 right-0 top-0 z-40 border-b border-[rgba(176,137,104,0.28)] bg-[linear-gradient(120deg,rgba(255,255,252,0.98),rgba(252,248,242,0.94))] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2">
            <Gift size={14} className="text-gold" />
            <span className="font-serif text-xl text-wine">Chá de Cozinha</span>
          </div>

          <nav className="hidden flex-wrap items-center justify-end gap-2 lg:flex">
            <button
              type="button"
              onClick={() => handleSectionChange('presentes')}
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
              onClick={() => handleSectionChange('confirmacoes')}
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
              onClick={() => handleSectionChange('convidadas')}
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

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="inline-flex items-center justify-center rounded-full border border-[rgba(176,137,104,0.28)] bg-card p-2 text-[rgb(120,53,34)] shadow-sm transition hover:bg-[rgba(120,53,34,0.08)] lg:hidden"
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className={`lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="mx-4 mb-4 rounded-2xl border border-[rgba(176,137,104,0.22)] bg-[rgba(255,252,247,0.98)] p-3 shadow-[0_12px_30px_rgba(84,52,38,0.08)]">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => handleSectionChange('presentes')}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-sans text-sm font-semibold transition ${
                  activeSection === 'presentes'
                    ? 'bg-[rgba(161,38,38,0.12)] text-wine'
                    : 'text-[var(--earth)] hover:bg-[rgba(120,53,34,0.08)]'
                }`}
              >
                <Gift size={16} />
                Lista de Presentes
              </button>

              <button
                type="button"
                onClick={() => handleSectionChange('confirmacoes')}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-sans text-sm font-semibold transition ${
                  activeSection === 'confirmacoes'
                    ? 'bg-[rgba(161,38,38,0.12)] text-wine'
                    : 'text-[var(--earth)] hover:bg-[rgba(120,53,34,0.08)]'
                }`}
              >
                <HeartHandshake size={16} />
                Confirmações
              </button>

              <button
                type="button"
                onClick={() => handleSectionChange('convidadas')}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-sans text-sm font-semibold transition ${
                  activeSection === 'convidadas'
                    ? 'bg-[rgba(161,38,38,0.12)] text-wine'
                    : 'text-[var(--earth)] hover:bg-[rgba(120,53,34,0.08)]'
                }`}
              >
                <Users size={16} />
                Lista de Convidados
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-sans text-sm font-semibold text-[rgb(120,53,34)] transition hover:bg-[rgba(120,53,34,0.08)]"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div ref={contentScrollRef} className={`admin-page-content mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-6 pt-[88px] sm:px-6 sm:pb-8 sm:pt-[96px] lg:px-8 ${
        activeSection === 'presentes' ? 'overflow-hidden' : 'overflow-y-auto'
      }`}>
        {activeSection === 'presentes' ? (
          <section className="admin-section-card animate-fade-up flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-[1.75rem] leading-snug tracking-[0.01em] font-normal text-wine">Lista de Presentes</h1>
                <div className="gold-divider mt-3 w-28" />
                <div className="mt-3 grid grid-cols-3 gap-1.5 sm:max-w-sm sm:gap-2">
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{presentes.length}</p>
                    <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">presentes</p>
                  </article>
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{confirmacoes.length}</p>
                    <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">confirmados</p>
                  </article>
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{pendingGiftCount}</p>
                    <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">pendentes</p>
                  </article>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-stretch">
                <GiftImportButton
                  existingGiftNames={normalizedGiftNames}
                  onImported={handleImportedGifts}
                />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className={`${actionButtonClass} w-full sm:w-auto`}
                >
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
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhum presente cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presentes.map((item) => {
                  const isConfirmed = confirmedGiftIds.has(item.id)
                  const reservedByName = confirmedGuestNameByGiftId[item.id]
                  const isEditing = editingGiftId === item.id
                  const isUpdating = updatingGiftId === item.id
                  const isDeleting = deletingGiftId === item.id

                  return (
                  <article
                    key={item.id}
                    className={`group rounded-2xl border bg-card p-4 elegant-shadow transition sm:p-5 ${
                      isConfirmed
                        ? 'border-[rgba(60,138,86,0.35)] hover:border-[rgba(60,138,86,0.5)]'
                        : 'border-border hover:border-gold/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingGiftName}
                              onChange={(event) => setEditingGiftName(event.target.value)}
                              className="font-sans w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                              placeholder="Nome do presente"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateGift(item.id)}
                                disabled={isUpdating}
                                className="font-sans inline-flex items-center gap-1 rounded-full border border-[rgba(60,138,86,0.35)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.08)] disabled:cursor-not-allowed"
                              >
                                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelGiftEdit}
                                disabled={isUpdating}
                                className="font-sans inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition hover:bg-[rgba(120,53,34,0.06)] disabled:cursor-not-allowed"
                              >
                                <X size={12} />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="truncate font-sans text-lg leading-snug font-medium tracking-[0.005em] text-wine sm:text-xl">{item.nome}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleStartGiftEdit(item)}
                          disabled={isDeleting || isUpdating}
                          className="rounded-full p-1 text-muted-foreground transition hover:text-[var(--wine)] disabled:cursor-not-allowed"
                          aria-label={`Editar ${item.nome}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGift(item.id)}
                          disabled={isDeleting || isUpdating}
                          className="rounded-full p-1 text-muted-foreground transition hover:text-destructive disabled:cursor-not-allowed"
                          aria-label={`Excluir ${item.nome}`}
                        >
                          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${isConfirmed ? 'bg-[rgb(52,112,72)]' : 'bg-[var(--earth)]'}`} />
                      <span className={`font-sans text-xs font-semibold uppercase tracking-[0.14em] ${isConfirmed ? 'text-[rgb(52,112,72)]' : 'text-muted-foreground'}`}>
                        {isConfirmed ? 'Reservado' : 'Aguardando'}
                      </span>
                    </div>

                    {isConfirmed && reservedByName ? (
                      <p className="mt-2 font-sans text-sm text-muted-foreground">
                        <span className="font-semibold text-[var(--ink)]">{reservedByName}</span>
                      </p>
                    ) : null}
                  </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : activeSection === 'confirmacoes' ? (
          <section className="admin-section-card animate-fade-up flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-[1.75rem] leading-snug tracking-[0.01em] font-normal text-wine">Confirmações</h1>
                <div className="gold-divider mt-3 w-32" />
                <div className="mt-3 grid grid-cols-3 gap-1.5 sm:max-w-sm sm:gap-2">
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{presentes.length}</p>
                    <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">presentes</p>
                  </article>
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{confirmacoes.length}</p>
                    <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">confirmados</p>
                  </article>
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.45rem] leading-none text-[var(--wine)] sm:text-[1.6rem]">{filteredConfirmacoes.length}</p>
                    <p className="mt-0.5 font-sans text-[9px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[11px]">resultado</p>
                  </article>
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 sm:min-w-[240px]">
                <Search size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar nome ou presente"
                  className="w-full bg-transparent text-[var(--ink)] outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : confirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">Ainda nao ha confirmacoes.</p>
              </div>
            ) : filteredConfirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhum resultado para essa busca.</p>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredConfirmacoes.map((item) => (
                  <article
                    key={item.id}
                    className="self-start rounded-2xl border border-border bg-card p-4 elegant-shadow transition hover:border-gold/40 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-secondary font-serif text-wine">
                          {item.primeiro_nome?.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-sans text-lg leading-snug font-semibold tracking-[0.01em] text-wine [font-variant-numeric:lining-nums] sm:text-xl">{item.primeiro_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.created_at && new Date(item.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {editingConfirmationId === item.id ? null : (
                        <button
                          type="button"
                          onClick={() => handleStartConfirmationEdit(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-[var(--wine)]"
                          aria-label={`Editar confirmacao de ${item.primeiro_nome}`}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>

                    <div className="gold-divider my-4" />

                    {editingConfirmationId === item.id ? (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Trocar presente</span>
                          <select
                            value={editingConfirmationGiftId}
                            onChange={(event) => setEditingConfirmationGiftId(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 font-sans text-base font-medium text-[var(--ink)] outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                          >
                            <option value="">Selecione um presente</option>
                            {presentes
                              .filter((gift) => !assignedGiftIds.has(gift.id) || gift.id === item.presente_id)
                              .map((gift) => (
                                <option key={gift.id} value={gift.id}>
                                  {gift.nome}
                                </option>
                              ))}
                          </select>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateConfirmationGift(item.id)}
                            disabled={updatingConfirmationId === item.id}
                            className="btn-success font-sans inline-flex items-center justify-center gap-2"
                          >
                            {updatingConfirmationId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Salvar
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelConfirmationEdit}
                            disabled={updatingConfirmationId === item.id}
                            className="btn-secondary font-sans inline-flex items-center justify-center gap-2"
                          >
                            <X size={16} />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <Gift size={16} className="text-gold" />
                        <span className="font-sans truncate text-base font-semibold text-[var(--ink)] sm:text-[1.05rem]">{item.presente_nome}</span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="admin-section-card animate-fade-up flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-serif text-[1.75rem] leading-snug tracking-[0.01em] font-normal text-wine">Lista de Convidados</h2>
                <div className="gold-divider mt-3 w-32" />
                <p className="mt-1 font-sans text-muted-foreground">Cadastre convidadas, envie o convite único e acompanhe o status.</p>
                <div className="mt-3 grid grid-cols-3 gap-1.5 sm:max-w-sm sm:gap-2">
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.2rem] leading-none text-[var(--wine)] sm:text-[1.35rem]">{convidadas.length}</p>
                    <p className="mt-0.5 font-sans text-[8px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[10px]">convidadas</p>
                  </article>
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.2rem] leading-none text-[var(--wine)] sm:text-[1.35rem]">{confirmedGuestCount}</p>
                    <p className="mt-0.5 font-sans text-[8px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[10px]">confirmadas</p>
                  </article>
                  <article className="rounded-xl border border-[rgba(176,137,104,0.24)] bg-[rgba(228,214,198,0.72)] px-1.5 py-2 text-center sm:px-2">
                    <p className="font-sans text-[1.2rem] leading-none text-[var(--wine)] sm:text-[1.35rem]">{pendingGuestCount}</p>
                    <p className="mt-0.5 font-sans text-[8px] lowercase tracking-[0.02em] text-[var(--earth)] sm:text-[10px]">pendentes</p>
                  </article>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-stretch">
                {!isGuestFormOpen ? (
                  <GuestImportButton
                    existingGuestPhones={normalizedGuestPhones}
                    onImported={handleImportedGuests}
                    disabled={savingGuest}
                    className="w-full px-4 py-2.5 md:hidden"
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsGuestFormOpen((current) => !current)}
                  className={`${actionButtonClass} w-full px-4 py-2.5 sm:hidden`}
                >
                  {isGuestFormOpen ? <X size={18} /> : <Plus size={18} />}
                  {isGuestFormOpen ? 'Fechar cadastro' : 'Nova convidada'}
                </button>
              </div>
            </div>

            <form
              onSubmit={handleAddGuest}
              className={`${isGuestFormOpen ? 'mb-4 flex' : 'hidden'} flex-col rounded-2xl border border-border bg-card p-3 sm:mb-6 sm:flex sm:p-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-gold sm:text-sm">Nova convidada</p>
                <button
                  type="button"
                  onClick={() => setIsGuestFormOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-[var(--earth)] transition hover:bg-[rgba(120,53,34,0.08)] sm:hidden"
                  aria-label="Fechar cadastro"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:gap-3 md:grid-cols-[1.3fr_1fr_auto_auto] md:items-center">
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 font-sans text-base font-medium text-[var(--ink)] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40 sm:px-4 sm:py-3"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={guestWhatsapp}
                  onChange={(event) => setGuestWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="WhatsApp com DDD"
                  className="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 font-sans text-base font-medium text-[var(--ink)] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40 sm:px-4 sm:py-3"
                />
                <GuestImportButton
                  existingGuestPhones={normalizedGuestPhones}
                  onImported={handleImportedGuests}
                  disabled={savingGuest}
                  className="!hidden px-4 py-2.5 md:!inline-flex md:w-auto"
                />
                <button
                  type="submit"
                  disabled={savingGuest}
                  className={`${actionButtonClass} w-full px-4 py-2.5 md:w-auto md:justify-self-end`}
                >
                  {savingGuest ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {savingGuest ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>

            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : convidadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhuma convidada cadastrada ainda.</p>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1 sm:gap-3 sm:grid-cols-2">
                {convidadas.map((item) => (
                  <article key={item.id} className="self-start rounded-2xl border border-border bg-card p-3 sm:p-4 md:p-3 elegant-shadow">
                    <div className="flex items-start justify-between gap-3">
                      {editingGuestId === item.id ? (
                        <div className="w-full space-y-2">
                          <input
                            type="text"
                            value={editingGuestName}
                            onChange={(event) => setEditingGuestName(event.target.value)}
                            placeholder="Nome completo"
                            className="w-full rounded-xl border border-input bg-background px-3 py-2 font-sans text-base font-medium text-[var(--ink)] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editingGuestWhatsapp}
                            onChange={(event) => setEditingGuestWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="WhatsApp com DDD"
                            className="w-full rounded-xl border border-input bg-background px-3 py-2 font-sans text-base font-medium text-[var(--ink)] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-sans text-lg leading-snug font-semibold tracking-[0.01em] text-wine sm:text-xl">{item.nome}</p>
                          <p className="font-sans text-sm leading-relaxed text-muted-foreground">{formatWhatsapp(item.whatsapp)}</p>
                        </div>
                      )}

                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] ${
                        item.status === 'confirmada'
                          ? 'bg-[rgba(60,138,86,0.15)] text-[rgb(52,112,72)]'
                          : 'bg-[rgba(179,90,60,0.12)] text-[var(--rust)]'
                      }`}>
                        {item.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                      </span>
                    </div>

                    {editingGuestId === item.id ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateGuest(item.id)}
                          disabled={updatingGuestId === item.id}
                          className="btn-success font-sans inline-flex items-center justify-center gap-2"
                        >
                          {updatingGuestId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          Salvar
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelGuestEdit}
                          disabled={updatingGuestId === item.id}
                          className="btn-secondary font-sans inline-flex items-center justify-center gap-2"
                        >
                          <X size={16} />
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div className="grid grid-cols-3 gap-2">
                          <a
                            href={getInviteWhatsappUrl(item) ?? '#'}
                            onClick={(event) => handleInviteLinkClick(event, item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(60,138,86,0.28)] bg-[rgba(60,138,86,0.12)] text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.2)] md:h-8"
                            aria-label={`Enviar convite para ${item.nome}`}
                          >
                            <MessageCircle size={16} />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleStartGuestEdit(item)}
                            disabled={deletingGuestId === item.id}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(176,137,104,0.32)] bg-[rgba(228,214,198,0.44)] text-[var(--earth)] transition hover:bg-[rgba(176,137,104,0.2)] disabled:cursor-not-allowed md:h-8"
                            aria-label={`Editar ${item.nome}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(item.id)}
                            disabled={deletingGuestId === item.id}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[rgba(179,90,60,0.28)] bg-[rgba(179,90,60,0.12)] text-[var(--rust)] transition hover:bg-[rgba(179,90,60,0.2)] disabled:cursor-not-allowed md:h-8"
                            aria-label={`Excluir ${item.nome}`}
                          >
                            {deletingGuestId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>

                        <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(52,112,72)] md:text-[10px]">Enviar</span>
                          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--earth)] md:text-[10px]">Editar</span>
                          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--rust)] md:text-[10px]">Excluir</span>
                        </div>
                      </div>
                    )}
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
