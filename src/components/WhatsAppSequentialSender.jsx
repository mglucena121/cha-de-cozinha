import { useMemo, useState, useEffect } from 'react'

function WhatsAppSequentialSender({ guests, getInviteWhatsappUrl, className = '' }) {
  const sendableGuests = useMemo(
    () => guests.filter((guest) => guest.status !== 'confirmada' && Boolean(getInviteWhatsappUrl(guest))),
    [guests, getInviteWhatsappUrl],
  )

  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex((previousIndex) => Math.min(previousIndex, sendableGuests.length))
  }, [sendableGuests.length])

  const totalGuests = sendableGuests.length
  const isFinished = totalGuests === 0 || currentIndex >= totalGuests
  const currentGuest = isFinished ? null : sendableGuests[currentIndex]

  const handleSequentialSend = () => {
    if (!currentGuest) {
      return
    }

    const whatsappUrl = getInviteWhatsappUrl(currentGuest)

    if (!whatsappUrl) {
      return
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    setCurrentIndex((previousIndex) => Math.min(previousIndex + 1, totalGuests))
  }

  return (
    <button
      type="button"
      onClick={handleSequentialSend}
      disabled={isFinished}
      className={`inline-flex w-full items-center justify-center rounded-xl border border-[rgba(60,138,86,0.28)] bg-[rgba(60,138,86,0.14)] px-4 py-2.5 font-sans text-sm font-semibold text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.2)] disabled:cursor-not-allowed disabled:opacity-70 ${className}`.trim()}
    >
      {isFinished ? 'Todos enviados' : 'Enviar para todos'}
    </button>
  )
}

export default WhatsAppSequentialSender