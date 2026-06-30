import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gift, HeartHandshake, Loader2, LogOut, Menu, X, Plus, Trash2, Users, MessageCircle, Pencil, Check, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  buildConfirmacoesFromGuests,
  buildWhatsappSendUrl,
  normalizePhone,
  scrollContentToTop,
} from '../lib/adminHelpers'
import AdminSearchInput from '../components/admin/AdminSearchInput'
import AdminStats from '../components/admin/AdminStats'
import FilterTabs from '../components/admin/FilterTabs'
import Pagination from '../components/admin/Pagination'
import GiftImportButton from '../components/PresenteImporteExcel'
import GuestImportButton from '../components/ConvidadaImporteExcel'
import WhatsAppSequentialSender from '../components/WhatsAppSequentialSender'

const PRESENTES_PAGE_SIZE = 4
const CONFIRMACOES_PAGE_SIZE = 4
const CONVIDADAS_PAGE_SIZE = 4

const NAV_ACTIVE_CLASS =
  'border border-[rgba(214,176,106,0.55)] bg-[rgba(255,255,255,0.94)] text-wine shadow-[0_4px_12px_rgba(84,52,38,0.08)]'
const NAV_INACTIVE_CLASS =
  'bg-transparent text-[var(--earth)] hover:bg-[rgba(120,53,34,0.14)] hover:text-[rgb(98,43,28)]'

function AdminPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('presentes')
  const [presentes, setPresentes] = useState([])
  const [convidadas, setConvidadas] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [isGiftFormOpen, setIsGiftFormOpen] = useState(false)
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
  const [presentesSearch, setPresentesSearch] = useState('')
  const [presentesFilter, setPresentesFilter] = useState('all')
  const [convidadasSearch, setConvidadasSearch] = useState('')
  const [convidadasFilter, setConvidadasFilter] = useState('all')
  const [presentesPage, setPresentesPage] = useState(1)
  const [confirmacoesPage, setConfirmacoesPage] = useState(1)
  const [convidadasPage, setConvidadasPage] = useState(1)
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

  const confirmacoes = useMemo(
    () => buildConfirmacoesFromGuests(convidadas),
    [convidadas],
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
    () => new Set(convidadas.map((item) => normalizePhone(item.whatsapp))),
    [convidadas],
  )

  const reservedPresentesCount = useMemo(
    () => presentes.filter((item) => confirmedGiftIds.has(item.id)).length,
    [presentes, confirmedGiftIds],
  )

  const filteredPresentes = useMemo(() => {
    const normalizedSearch = presentesSearch.trim().toLowerCase()

    return presentes.filter((item) => {
      const isConfirmed = confirmedGiftIds.has(item.id)

      if (presentesFilter === 'disponivel' && isConfirmed) return false
      if (presentesFilter === 'reservado' && !isConfirmed) return false
      if (normalizedSearch && !item.nome.toLowerCase().includes(normalizedSearch)) return false

      return true
    })
  }, [presentes, presentesSearch, presentesFilter, confirmedGiftIds])

  const filteredConvidadas = useMemo(() => {
    const normalizedSearch = convidadasSearch.trim().toLowerCase()

    return convidadas.filter((item) => {
      if (convidadasFilter === 'confirmada' && item.status !== 'confirmada') return false
      if (convidadasFilter === 'pendente' && item.status === 'confirmada') return false

      if (normalizedSearch) {
        const digits = item.whatsapp.replace(/\D/g, '')
        const normalizedQuery = normalizedSearch.replace(/\D/g, '')
        const matchesName = item.nome.toLowerCase().includes(normalizedSearch)
        const matchesPhone = normalizedQuery.length > 0 && digits.includes(normalizedQuery)

        if (!matchesName && !matchesPhone) return false
      }

      return true
    })
  }, [convidadas, convidadasSearch, convidadasFilter])

  const paginatedPresentes = useMemo(() => {
    const start = (presentesPage - 1) * PRESENTES_PAGE_SIZE
    return filteredPresentes.slice(start, start + PRESENTES_PAGE_SIZE)
  }, [filteredPresentes, presentesPage])

  const paginatedConfirmacoes = useMemo(() => {
    const start = (confirmacoesPage - 1) * CONFIRMACOES_PAGE_SIZE
    return filteredConfirmacoes.slice(start, start + CONFIRMACOES_PAGE_SIZE)
  }, [filteredConfirmacoes, confirmacoesPage])

  const paginatedConvidadas = useMemo(() => {
    const start = (convidadasPage - 1) * CONVIDADAS_PAGE_SIZE
    return filteredConvidadas.slice(start, start + CONVIDADAS_PAGE_SIZE)
  }, [filteredConvidadas, convidadasPage])

  const presentesTotalPages = Math.max(1, Math.ceil(filteredPresentes.length / PRESENTES_PAGE_SIZE))
  const confirmacoesTotalPages = Math.max(1, Math.ceil(filteredConfirmacoes.length / CONFIRMACOES_PAGE_SIZE))
  const convidadasTotalPages = Math.max(1, Math.ceil(filteredConvidadas.length / CONVIDADAS_PAGE_SIZE))

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
    setConvidadas(convidadasData ?? [])
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  useEffect(() => {
    setPresentesPage(1)
  }, [presentesSearch, presentesFilter])

  useEffect(() => {
    setConfirmacoesPage(1)
  }, [searchTerm])

  useEffect(() => {
    setConvidadasPage(1)
  }, [convidadasSearch, convidadasFilter])

  useEffect(() => {
    if (presentesPage > presentesTotalPages) {
      setPresentesPage(presentesTotalPages)
    }
  }, [presentesPage, presentesTotalPages])

  useEffect(() => {
    if (confirmacoesPage > confirmacoesTotalPages) {
      setConfirmacoesPage(confirmacoesTotalPages)
    }
  }, [confirmacoesPage, confirmacoesTotalPages])

  useEffect(() => {
    if (convidadasPage > convidadasTotalPages) {
      setConvidadasPage(convidadasTotalPages)
    }
  }, [convidadasPage, convidadasTotalPages])

  const handlePresentesPageChange = useCallback((page) => {
    setPresentesPage(page)
  }, [])

  const handleConfirmacoesPageChange = useCallback((page) => {
    setConfirmacoesPage(page)
  }, [])

  const handleConvidadasPageChange = useCallback((page) => {
    setConvidadasPage(page)
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Sessão encerrada.')
    navigate('/login', { replace: true })
  }

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section)
    closeMobileMenu()
    setPresentesPage(1)
    setConfirmacoesPage(1)
    setConvidadasPage(1)

    if (section !== 'convidadas') {
      setIsGuestFormOpen(false)
    }

    if (section !== 'presentes') {
      setIsGiftFormOpen(false)
    }

    requestAnimationFrame(() => {
      scrollContentToTop(contentScrollRef, 'auto')
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
    setIsGiftFormOpen(false)
    toast.success('Presente adicionado com sucesso!')
  }

  const handleDeleteGift = async (giftId) => {
    const gift = presentes.find((item) => item.id === giftId)
    const reservedByName = confirmedGuestNameByGiftId[giftId]

    if (confirmedGiftIds.has(giftId)) {
      toast.error(
        reservedByName
          ? `Este presente está reservado por ${reservedByName}. Não é possível excluir.`
          : 'Este presente está reservado e não pode ser excluído.',
      )
      return
    }

    const confirmed = window.confirm(
      gift ? `Excluir o presente "${gift.nome}"? Esta ação não pode ser desfeita.` : 'Excluir este presente?',
    )

    if (!confirmed) return

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
      if (error.code === 'PGRST116') {
        toast.error('Não foi possível atualizar o presente. Confirme a policy de UPDATE em presentes no Supabase.')
      } else {
        toast.error(error.message)
      }
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
      toast.error('Use um WhatsApp válido com DDD (10 ou 11 dígitos).')
      return
    }

    if (normalizedGuestPhones.has(normalizedWhatsapp)) {
      toast.error('Este WhatsApp já está cadastrado.')
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
    const guest = convidadas.find((item) => item.id === guestId)

    if (!guest) return

    const message =
      guest.status === 'confirmada'
        ? `${guest.nome} já confirmou presença. Excluir mesmo assim? A confirmação também será removida.`
        : `Excluir ${guest.nome} da lista? Esta ação não pode ser desfeita.`

    if (!window.confirm(message)) return

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
      toast.error('Confirmação não encontrada.')
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
      toast.error('Use um WhatsApp válido com DDD (10 ou 11 dígitos).')
      return
    }

    const phoneAlreadyUsed = convidadas.some(
      (item) => item.id !== guestId && normalizePhone(item.whatsapp) === normalizedWhatsapp,
    )

    if (phoneAlreadyUsed) {
      toast.error('Este WhatsApp já está cadastrado para outra convidada.')
      return
    }

    const currentGuest = convidadas.find((item) => item.id === guestId)

    if (!currentGuest) {
      toast.error('Convidada não encontrada.')
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
      const normalizedWhatsapp = normalizePhone(guest.whatsapp)

      if (!normalizedWhatsapp || !guest.token) {
        return null
      }

      const inviteLink = buildInviteLink(guest.token)
      const message = `Olá, ${guest.nome}!\nVocê está convidada para o nosso Chá de Cozinha!\nClique no link para confirmar sua presença e escolher seu presente:\n\n${inviteLink}\n\nMal podemos esperar para celebrar com você!`
      return buildWhatsappSendUrl(normalizedWhatsapp, message)
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
                activeSection === 'presentes' ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS
              }`}
            >
              <Gift size={15} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Lista de Presentes</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionChange('confirmacoes')}
              className={`group font-sans inline-flex items-center gap-3 rounded-full px-6 py-2 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                activeSection === 'confirmacoes' ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS
              }`}
            >
              <HeartHandshake size={15} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">Confirmações</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionChange('convidadas')}
              className={`group font-sans inline-flex items-center gap-3 rounded-full px-6 py-2 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                activeSection === 'convidadas' ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS
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

      <div
        ref={contentScrollRef}
        className="admin-page-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="admin-page-inner mx-auto flex w-full max-w-6xl flex-col px-4 pb-6 pt-[88px] sm:px-6 sm:pb-8 sm:pt-[96px] lg:px-8">
        {activeSection === 'presentes' ? (
          <section className="admin-section-card animate-fade-up flex flex-1 flex-col rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[1.75rem] leading-snug tracking-[0.01em] font-normal text-wine sm:text-[2rem]">
                  Lista de Presentes
                </h1>
                <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
                  Cadastre os itens do chá, acompanhe reservas e mantenha a lista sempre atualizada.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsGiftFormOpen((current) => !current)}
                className={`${actionButtonClass} gap-2 !rounded-xl !px-5 !py-2.5 !text-xs !font-bold !uppercase !tracking-[0.1em] sm:mt-1 sm:hidden`}
              >
                {isGiftFormOpen ? <X size={16} /> : <Plus size={16} />}
                {isGiftFormOpen ? 'Fechar' : 'Novo presente'}
              </button>
            </div>

            <AdminStats
              variant="wide"
              className="mt-5"
              items={[
                { value: presentes.length, label: 'presentes' },
                { value: reservedPresentesCount, label: 'reservados' },
                { value: pendingGiftCount, label: 'pendentes' },
              ]}
            />

            <form
              onSubmit={handleAddGift}
              className={`${isGiftFormOpen ? 'mt-4 flex' : 'hidden'} flex-col rounded-2xl border border-[rgba(176,137,104,0.22)] bg-[rgba(255,252,247,0.72)] p-4 sm:mt-6 sm:flex sm:p-5`}
            >
              <p className="font-sans text-sm font-semibold uppercase tracking-[0.1em] text-[var(--earth)]">
                Novo presente
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                <input
                  type="text"
                  value={giftName}
                  onChange={(event) => setGiftName(event.target.value)}
                  placeholder="Nome do presente"
                  className="w-full rounded-xl border border-[rgba(176,137,104,0.22)] bg-white px-4 py-3 font-sans text-sm text-[var(--ink)] outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                />
                <GiftImportButton
                  existingGiftNames={normalizedGiftNames}
                  onImported={handleImportedGifts}
                  className="!w-full !rounded-xl !border !border-[rgba(176,137,104,0.32)] !bg-[rgba(228,214,198,0.55)] !px-5 !py-3 !text-xs !font-bold !uppercase !tracking-[0.1em] !text-[var(--earth)] hover:!bg-[rgba(176,137,104,0.22)] lg:!w-auto"
                />
                <button
                  type="submit"
                  disabled={savingGift}
                  className={`${actionButtonClass} w-full gap-2 !rounded-xl !px-5 !py-3 !text-xs !font-bold !uppercase !tracking-[0.1em] lg:w-auto`}
                >
                  {savingGift ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {savingGift ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>

            {presentes.length > 0 ? (
              <div className="mb-4 mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                <AdminSearchInput
                  value={presentesSearch}
                  onChange={(event) => setPresentesSearch(event.target.value)}
                  placeholder="Buscar presente..."
                  variant="soft"
                  className="w-full lg:min-w-0 lg:flex-1"
                />
                <FilterTabs
                  variant="segment"
                  value={presentesFilter}
                  onChange={setPresentesFilter}
                  options={[
                    { id: 'all', label: 'Todos' },
                    { id: 'disponivel', label: 'Disponíveis' },
                    { id: 'reservado', label: 'Reservados' },
                  ]}
                />
              </div>
            ) : null}

            {loadingData ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : presentes.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhum presente cadastrado ainda.</p>
              </div>
            ) : filteredPresentes.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhum resultado para essa busca ou filtro.</p>
              </div>
            ) : (
              <>
              <div className="grid gap-3 sm:grid-cols-2">
                {paginatedPresentes.map((item) => {
                  const isConfirmed = confirmedGiftIds.has(item.id)
                  const reservedByName = confirmedGuestNameByGiftId[item.id]
                  const isEditing = editingGiftId === item.id
                  const isUpdating = updatingGiftId === item.id
                  const isDeleting = deletingGiftId === item.id

                  return (
                  <article
                    key={item.id}
                    className={`group flex h-full min-w-0 flex-col rounded-2xl border bg-card p-4 elegant-shadow transition ${
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

                      <div className="flex items-center gap-1 opacity-100 transition">
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
                      <p className="mt-2 min-h-5 truncate font-sans text-sm text-muted-foreground">
                        <span className="font-semibold text-[var(--ink)]">{reservedByName}</span>
                      </p>
                    ) : (
                      <p className="mt-2 min-h-5 font-sans text-sm text-muted-foreground" aria-hidden="true">
                        {'\u00A0'}
                      </p>
                    )}
                  </article>
                  )
                })}
              </div>
              <Pagination
                currentPage={presentesPage}
                totalPages={presentesTotalPages}
                onPageChange={handlePresentesPageChange}
              />
              </>
            )}
          </section>
        ) : activeSection === 'confirmacoes' ? (
          <section className="admin-section-card animate-fade-up flex flex-1 flex-col rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[1.75rem] leading-snug tracking-[0.01em] font-normal text-wine sm:text-[2rem]">
                  Confirmações
                </h1>
                <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
                  Veja quem confirmou presença, qual presente escolheu e gerencie as reservas em tempo real.
                </p>
              </div>
            </div>

            <AdminStats
              variant="wide"
              className="mt-5"
              items={[
                { value: confirmacoes.length, label: 'confirmadas' },
                { value: presentes.length, label: 'presentes' },
                { value: pendingGuestCount, label: 'convites pendentes' },
              ]}
            />

            {confirmacoes.length > 0 ? (
              <div className="mb-4 mt-6">
                <AdminSearchInput
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome ou presente..."
                  variant="soft"
                  className="w-full"
                />
              </div>
            ) : null}

            {loadingData ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : confirmacoes.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
                <p className="text-sm leading-relaxed text-muted-foreground">Ainda não há confirmações.</p>
              </div>
            ) : filteredConfirmacoes.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhum resultado para essa busca.</p>
              </div>
            ) : (
              <>
              <div className="grid gap-3 sm:grid-cols-2">
                {paginatedConfirmacoes.map((item) => (
                  <article
                    key={item.id}
                    className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 elegant-shadow transition hover:border-gold/40"
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

                    <div className="mt-auto">
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
                      <div className="flex min-h-6 items-center gap-2 text-sm">
                        <Gift size={16} className="shrink-0 text-gold" />
                        <span className="font-sans truncate text-base font-semibold text-[var(--ink)] sm:text-[1.05rem]">{item.presente_nome}</span>
                      </div>
                    )}
                    </div>
                  </article>
                ))}
              </div>
              <Pagination
                currentPage={confirmacoesPage}
                totalPages={confirmacoesTotalPages}
                onPageChange={handleConfirmacoesPageChange}
              />
              </>
            )}
          </section>
        ) : (
          <section className="admin-section-card animate-fade-up flex flex-1 flex-col rounded-3xl border border-border bg-card/90 p-5 elegant-shadow sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[1.75rem] leading-snug tracking-[0.01em] font-normal text-wine sm:text-[2rem]">
                  Lista de Convidados
                </h1>
                <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
                  Gerencie suas convidadas, envie convites únicos e acompanhe o status de presença em tempo real.
                </p>
              </div>

              <WhatsAppSequentialSender
                guests={convidadas}
                getInviteWhatsappUrl={getInviteWhatsappUrl}
                variant="mockup"
                className="sm:mt-1"
              />
            </div>

            <AdminStats
              variant="wide"
              className="mt-5"
              items={[
                { value: convidadas.length, label: 'convidadas' },
                { value: confirmedGuestCount, label: 'confirmadas' },
                { value: pendingGuestCount, label: 'pendentes' },
              ]}
            />

            <button
              type="button"
              onClick={() => setIsGuestFormOpen((current) => !current)}
              className={`${actionButtonClass} mt-4 w-full px-4 py-2.5 sm:hidden`}
            >
              {isGuestFormOpen ? <X size={18} /> : <Plus size={18} />}
              {isGuestFormOpen ? 'Fechar cadastro' : 'Nova convidada'}
            </button>

            <form
              onSubmit={handleAddGuest}
              className={`${isGuestFormOpen ? 'mt-4 flex' : 'hidden'} flex-col rounded-2xl border border-[rgba(176,137,104,0.22)] bg-[rgba(255,252,247,0.72)] p-4 sm:mt-6 sm:flex sm:p-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-sm font-semibold uppercase tracking-[0.1em] text-[var(--earth)]">
                  Nova convidada
                </p>
                <button
                  type="button"
                  onClick={() => setIsGuestFormOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-[var(--earth)] transition hover:bg-[rgba(120,53,34,0.08)] hover:text-wine focus:outline-none focus:ring-2 focus:ring-gold/40 sm:hidden"
                  aria-label="Fechar cadastro"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr_auto_auto] lg:items-center">
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-xl border border-[rgba(176,137,104,0.22)] bg-white px-4 py-3 font-sans text-sm text-[var(--ink)] outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={guestWhatsapp}
                  onChange={(event) => setGuestWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="WhatsApp com DDD"
                  className="w-full rounded-xl border border-[rgba(176,137,104,0.22)] bg-white px-4 py-3 font-sans text-sm text-[var(--ink)] outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                />
                <GuestImportButton
                  existingGuestPhones={normalizedGuestPhones}
                  onImported={handleImportedGuests}
                  disabled={savingGuest}
                  className="!w-full !rounded-xl !border !border-[rgba(176,137,104,0.32)] !bg-[rgba(228,214,198,0.55)] !px-5 !py-3 !text-xs !font-bold !uppercase !tracking-[0.1em] !text-[var(--earth)] hover:!bg-[rgba(176,137,104,0.22)] lg:!w-auto"
                />
                <button
                  type="submit"
                  disabled={savingGuest}
                  className={`${actionButtonClass} w-full gap-2 !rounded-xl !px-5 !py-3 !text-xs !font-bold !uppercase !tracking-[0.1em] lg:w-auto`}
                >
                  {savingGuest ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {savingGuest ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>

            {convidadas.length > 0 ? (
              <div className="mb-4 mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                <AdminSearchInput
                  value={convidadasSearch}
                  onChange={(event) => setConvidadasSearch(event.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  variant="soft"
                  className="w-full lg:min-w-0 lg:flex-1"
                />
                <FilterTabs
                  variant="segment"
                  value={convidadasFilter}
                  onChange={setConvidadasFilter}
                  options={[
                    { id: 'all', label: 'Todos' },
                    { id: 'confirmada', label: 'Confirmados' },
                    { id: 'pendente', label: 'Pendentes' },
                  ]}
                />
              </div>
            ) : null}

            {loadingData ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-wine" />
              </div>
            ) : convidadas.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhuma convidada cadastrada ainda.</p>
              </div>
            ) : filteredConvidadas.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
                <p className="text-sm leading-relaxed text-muted-foreground">Nenhum resultado para essa busca ou filtro.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                {paginatedConvidadas.map((item) => (
                  <article key={item.id} className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 elegant-shadow transition-colors hover:border-gold/30">
                    <div className="flex items-start justify-between gap-3">
                      {editingGuestId === item.id ? (
                        <div className="w-full space-y-2">
                          <input
                            type="text"
                            value={editingGuestName}
                            onChange={(event) => setEditingGuestName(event.target.value)}
                            placeholder="Nome completo"
                            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-sans text-base text-[var(--ink)] outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editingGuestWhatsapp}
                            onChange={(event) => setEditingGuestWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="WhatsApp com DDD"
                            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-sans text-base text-[var(--ink)] outline-none transition placeholder:text-muted-foreground focus:border-gold/60 focus:ring-2 focus:ring-gold/40"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="truncate font-sans text-base leading-snug font-semibold text-wine sm:text-lg">{item.nome}</p>
                          <p className="mt-0.5 truncate font-sans text-sm text-muted-foreground">{formatWhatsapp(item.whatsapp)}</p>
                        </div>
                      )}

                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        item.status === 'confirmada'
                          ? 'bg-[rgba(60,138,86,0.15)] text-[rgb(52,112,72)]'
                          : 'bg-[rgba(179,90,60,0.12)] text-[var(--rust)]'
                      }`}>
                        {item.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                      </span>
                    </div>

                    {editingGuestId === item.id ? (
                      <div className="mt-auto grid gap-2 pt-3 sm:grid-cols-2">
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
                      <div className="mt-auto pt-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          <a
                            href={getInviteWhatsappUrl(item) ?? '#'}
                            onClick={(event) => handleInviteLinkClick(event, item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-[rgba(60,138,86,0.28)] bg-[rgba(60,138,86,0.12)] text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.22)] hover:border-[rgba(60,138,86,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(60,138,86,0.4)] sm:h-9"
                            aria-label={`Enviar convite para ${item.nome}`}
                          >
                            <MessageCircle size={16} />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleStartGuestEdit(item)}
                            disabled={deletingGuestId === item.id}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-[rgba(176,137,104,0.32)] bg-[rgba(228,214,198,0.44)] text-[var(--earth)] transition hover:bg-[rgba(176,137,104,0.22)] hover:border-[rgba(176,137,104,0.5)] focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9"
                            aria-label={`Editar ${item.nome}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(item.id)}
                            disabled={deletingGuestId === item.id}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-[rgba(179,90,60,0.28)] bg-[rgba(179,90,60,0.12)] text-[var(--rust)] transition hover:bg-[rgba(179,90,60,0.22)] hover:border-[rgba(179,90,60,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(179,90,60,0.35)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9"
                            aria-label={`Excluir ${item.nome}`}
                          >
                            {deletingGuestId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>

                        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
                          <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-[rgb(52,112,72)]">Enviar</span>
                          <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--earth)]">Editar</span>
                          <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--rust)]">Excluir</span>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                </div>
                <Pagination
                  currentPage={convidadasPage}
                  totalPages={convidadasTotalPages}
                  onPageChange={handleConvidadasPageChange}
                />
              </>
            )}
          </section>
        )}
        </div>
      </div>
    </main>
  )
}

export default AdminPage
