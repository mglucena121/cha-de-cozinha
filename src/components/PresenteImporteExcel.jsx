import { useMemo, useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

function GiftImportButton({ existingGiftNames, onImported, disabled = false, className = '' }) {
  const [importing, setImporting] = useState(false)

  const normalizedExisting = useMemo(() => {
    return new Set(Array.from(existingGiftNames || []).map((name) => String(name).trim().toLowerCase()))
  }, [existingGiftNames])

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
        (value) => value === 'nome' || value === 'presente' || value === 'presente_nome',
      )
      let dataStartIndex = 1

      if (nameColumnIndex === -1) {
        nameColumnIndex = 0
        dataStartIndex = 0
      }

      const rawNames = rows
        .slice(dataStartIndex)
        .map((row) => String(row?.[nameColumnIndex] || '').trim())
        .filter(Boolean)

      if (!rawNames.length) {
        toast.error('Nenhum presente valido encontrado na planilha.')
        return
      }

      const dedupedFromFile = []
      const seenFromFile = new Set()

      for (const name of rawNames) {
        const key = name.toLowerCase()
        if (seenFromFile.has(key)) continue
        seenFromFile.add(key)
        dedupedFromFile.push(name)
      }

      const namesToInsert = dedupedFromFile.filter(
        (name) => !normalizedExisting.has(name.toLowerCase()),
      )

      if (!namesToInsert.length) {
        toast('Todos os presentes da planilha ja existem.')
        return
      }

      const { data: insertedGifts, error } = await supabase
        .from('presentes')
        .insert(namesToInsert.map((nome) => ({ nome })))
        .select('id, nome, created_at')

      if (error) {
        if (error.code === '23505') {
          toast.error('Alguns presentes ja existem. Atualize e tente novamente.')
        } else {
          toast.error(error.message)
        }
        return
      }

      if (insertedGifts?.length) {
        onImported?.(insertedGifts)
      }

      const skippedCount = dedupedFromFile.length - namesToInsert.length
      if (skippedCount > 0) {
        toast.success(`Importacao concluida: ${namesToInsert.length} novos e ${skippedCount} ignorados.`)
      } else {
        toast.success(`Importacao concluida com ${namesToInsert.length} presentes.`)
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

export default GiftImportButton
