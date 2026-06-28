export function buildConfirmacoesFromGuests(guests) {
  return guests
    .filter((item) => item.status === 'confirmada' && item.presente?.nome)
    .map((item) => ({
      id: item.id,
      primeiro_nome: item.nome,
      presente_nome: item.presente.nome,
      presente_id: item.presente.id,
      created_at: item.created_at,
    }))
}

export function normalizePhone(whatsapp) {
  return String(whatsapp || '').replace(/\D/g, '').trim()
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export function buildWhatsappSendUrl(phone, message) {
  const encodedMessage = encodeURIComponent(message)
  if (isMobileDevice()) {
    return `https://wa.me/55${phone}?text=${encodedMessage}`
  }
  return `https://web.whatsapp.com/send?phone=55${phone}&text=${encodedMessage}`
}

export function scrollContentToTop(contentRef, behavior = 'smooth') {
  requestAnimationFrame(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior })
  })
}
