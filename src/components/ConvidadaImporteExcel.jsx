import { useMemo, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

function GuestImportButton({ existingGuestPhones, onImported, disabled = false, className = '' }) {
  const [importing, setImporting] = useState(false)

  const normalizedExistingPhones = useMemo(() => {
    return new Set(
      Array.from(existingGuestPhones || []).map((phone) =>
        String(phone || '').replace(/\D/g, '').trim(),
      ),
    )
  }, [existingGuestPhones])

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const isExcel = /\.(xlsx|xls)$/i.test(file.name)
    if (!isExcel) {
      toast.error('Envie um arquivo Excel (.xlsx ou .xls).')
      return
    }

    try {
      setImporting(true)

      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]

      if (!firstSheetName) {
        toast.error('Arquivo sem abas.')
        return
      }

      const worksheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (!rows.length) {
        toast.error('Arquivo vazio.')
        return
      }

      const header = (rows[0] || []).map((cell) => String(cell || '').trim().toLowerCase())

      let nameColumnIndex = header.findIndex(
        (value) => value === 'nome' || value === 'convidada' || value === 'nome_convidada',
      )
      let phoneColumnIndex = header.findIndex(
        (value) =>
          value === 'whatsapp' ||
          value === 'telefone' ||
          value === 'celular' ||
          value === 'numero' ||
          value === 'número',
      )
      let dataStartIndex = 1

      if (nameColumnIndex === -1 && phoneColumnIndex === -1) {
        nameColumnIndex = 0
        phoneColumnIndex = 1
        dataStartIndex = 0
      }

      if (nameColumnIndex === -1 || phoneColumnIndex === -1) {
        toast.error('A planilha precisa ter colunas de nome e telefone/whatsapp.')
        return
      }

      const parsedGuests = rows
        .slice(dataStartIndex)
        .map((row) => {
          const nome = String(row?.[nameColumnIndex] || '').trim()
          const whatsapp = String(row?.[phoneColumnIndex] || '').replace(/\D/g, '').trim()
          return { nome, whatsapp }
        })
        .filter((item) => item.nome && item.whatsapp)

      if (!parsedGuests.length) {
        toast.error('Nenhuma convidada valida encontrada na planilha.')
        return
      }

      const uniqueFromFile = []
      const seenPhones = new Set()

      for (const guest of parsedGuests) {
        if (guest.whatsapp.length < 10 || guest.whatsapp.length > 11) continue
        if (seenPhones.has(guest.whatsapp)) continue
        seenPhones.add(guest.whatsapp)
        uniqueFromFile.push(guest)
      }

      const guestsToInsert = uniqueFromFile.filter(
        (guest) => !normalizedExistingPhones.has(guest.whatsapp),
      )

      if (!guestsToInsert.length) {
        toast('Todos os telefones da planilha ja existem.')
        return
      }

      const { data: insertedGuests, error } = await supabase
        .from('convidadas')
        .insert(guestsToInsert.map((item) => ({ nome: item.nome, whatsapp: item.whatsapp })))
        .select('id, nome, whatsapp, token, status, presente_id, created_at, presente:presentes(id, nome)')

      if (error) {
        toast.error(error.message)
        return
      }

      if (insertedGuests?.length) {
        onImported?.(insertedGuests)
      }

      const skippedCount = uniqueFromFile.length - guestsToInsert.length
      if (skippedCount > 0) {
        toast.success(`Importacao concluida: ${guestsToInsert.length} novas e ${skippedCount} ignoradas.`)
      } else {
        toast.success(`Importacao concluida com ${guestsToInsert.length} convidadas.`)
      }
    } catch {
      toast.error('Nao foi possivel ler o arquivo Excel.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <label
      className={`btn-primary font-sans inline-flex cursor-pointer items-center justify-center gap-2 text-sm disabled:cursor-not-allowed ${className}`}
      aria-disabled={disabled || importing}
    >
      {importing ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
      {importing ? 'Importando...' : 'Importar'}
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImport}
        disabled={disabled || importing}
      />
    </label>
  )
}

export default GuestImportButton
