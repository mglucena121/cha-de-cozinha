import { useEffect, useMemo, useState } from 'react'
import { Gift, HeartHandshake, Loader2, LogOut, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AddGiftModal from '../components/AddGiftModal'

function AdminPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('presentes')
  const [presentes, setPresentes] = useState([])
  const [confirmacoes, setConfirmacoes] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [giftName, setGiftName] = useState('')
  const [savingGift, setSavingGift] = useState(false)
  const [deletingGiftId, setDeletingGiftId] = useState(null)

  const normalizedGiftNames = useMemo(
    () => new Set(presentes.map((item) => item.nome.trim().toLowerCase())),
    [presentes],
  )

  const loadData = async () => {
    setLoadingData(true)

    const [{ data: presentesData, error: presentsError }, { data: confirmacoesData, error: confirmationsError }] = await Promise.all([
      supabase.from('presentes').select('id, nome, created_at').order('created_at', { ascending: true }),
      supabase.from('confirmacoes').select('id, primeiro_nome, presente_nome, created_at').order('created_at', { ascending: false }),
    ])

    if (presentsError) {
      toast.error(`Erro ao buscar presentes: ${presentsError.message}`)
    }

    if (confirmationsError) {
      toast.error(`Erro ao buscar confirmacoes: ${confirmationsError.message}`)
    }

    setPresentes(presentesData ?? [])
    setConfirmacoes(confirmacoesData ?? [])
    setLoadingData(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('admin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentes' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confirmacoes' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

    const { error } = await supabase.from('presentes').insert({
      nome: giftName.trim(),
    })

    if (error) {
      if (error.code === '23505') {
        toast.error('Este presente ja existe.')
      } else {
        toast.error(error.message)
      }
      setSavingGift(false)
      return
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

    toast.success('Presente removido da lista.')
    setDeletingGiftId(null)
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
        </nav>

        {activeSection === 'presentes' ? (
          <section className="glass-card fade-rise p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl text-[var(--ink)] sm:text-3xl">Lista de Presentes</h2>
                <p className="text-[var(--earth)]">Adicione, visualize e remova itens da lista oficial.</p>
              </div>

              <button type="button" onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3">
                <Plus size={18} />
                Novo presente
              </button>
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
        ) : (
          <section className="glass-card fade-rise p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl text-[var(--ink)] sm:text-3xl">Confirmacoes</h2>
              <p className="text-[var(--earth)]">Visualize quem ja confirmou e qual presente escolheu.</p>
            </div>

            {loadingData ? (
              <div className="rounded-2xl border border-[rgba(140,100,74,0.16)] bg-[rgba(255,255,255,0.64)] p-8 text-center">
                <p className="inline-flex items-center gap-2 text-[var(--earth)]"><Loader2 size={18} className="animate-spin" /> Carregando confirmacoes...</p>
              </div>
            ) : confirmacoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgba(140,100,74,0.32)] bg-[rgba(255,255,255,0.54)] p-8 text-center text-[var(--earth)]">
                Ainda nao ha confirmacoes.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {confirmacoes.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[rgba(140,100,74,0.2)] bg-[rgba(255,252,247,0.9)] p-4 shadow-[0_6px_18px_rgba(84,52,38,0.08)] transition hover:-translate-y-0.5">
                    <p className="text-xl text-[var(--ink)]">{item.primeiro_nome}</p>
                    <p className="mt-1 text-[var(--earth)]">{item.presente_nome}</p>
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
