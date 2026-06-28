import { useMemo, useState, useEffect } from 'react'
import { CheckCheck } from 'lucide-react'

function WhatsAppSequentialSender({ guests, getInviteWhatsappUrl, className = '', variant = 'default' }) {
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

  const isMockupStyle = variant === 'mockup'

  return (
    <button
      type="button"
      onClick={handleSequentialSend}
      disabled={isFinished}
      className={
        isMockupStyle
          ? `inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(60,138,86,0.35)] bg-[rgba(60,138,86,0.14)] px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${className}`.trim()
          : `inline-flex w-full items-center justify-center rounded-xl border border-[rgba(60,138,86,0.28)] bg-[rgba(60,138,86,0.14)] px-4 py-2.5 font-sans text-sm font-semibold text-[rgb(52,112,72)] transition hover:bg-[rgba(60,138,86,0.2)] disabled:cursor-not-allowed disabled:opacity-70 ${className}`.trim()
      }
    >
      {isMockupStyle ? <CheckCheck size={16} className="shrink-0" /> : null}
      {isFinished ? (isMockupStyle ? 'Todos enviados' : 'Todos enviados') : isMockupStyle ? 'Enviar para todos' : 'Enviar para todos'}
    </button>
  )
}

export default WhatsAppSequentialSender
