import Link from 'next/link'
import type { Dict } from '@/i18n/dictionary'
import { fmt } from '@/i18n/lang'
import type { PlaceView } from '@/types/place'

// What the admin decided about the owner's place: waiting, refused (with the reason and the team's note), or the
// street name they proposed was removed. Light card so it reads the same on the dark success screen and on /mine.
export default function ReviewNotice({ place, t }: { place: PlaceView; t: Dict }) {
  const r = t.review
  const reasons = r.reasons as Record<string, string>
  const nameReasons = r.nameReasons as Record<string, string>

  return (
    <>
      {place.status === 'pending' && (
        <div role="status" className="rounded-2xl border-2 border-clay bg-sun-50 p-4 text-night-900">
          <p className="text-[17px] font-extrabold">{r.pendingTitle}</p>
          <p className="mt-1 text-base">{r.pendingText}</p>
        </div>
      )}
      {place.status === 'refused' && (
        <div role="alert" className="space-y-2 rounded-2xl border-2 border-danger bg-white p-4 text-night-900">
          <p className="text-[17px] font-extrabold text-danger">{r.refusedTitle}</p>
          <p className="text-base">{r.refusedText}</p>
          {place.refusal && <Reason label={r.reasonLabel} text={reasons[place.refusal.reason] || reasons.other} />}
          {place.refusal?.note && <Reason label={r.noteLabel} text={place.refusal.note} />}
          <Link href="/create" className="btn btn-primary w-full">{r.retry}</Link>
        </div>
      )}
      {place.nameNotice && (
        <div role="status" className="space-y-2 rounded-2xl border-2 border-clay bg-white p-4 text-night-900">
          <p className="text-[17px] font-extrabold">{r.nameTitle}</p>
          <p className="break-words text-base">{fmt(r.nameText, { name: place.nameNotice.name })}</p>
          <Reason label={r.reasonLabel} text={nameReasons[place.nameNotice.reason] || nameReasons.other} />
          {place.nameNotice.note && <Reason label={r.noteLabel} text={place.nameNotice.note} />}
        </div>
      )}
    </>
  )
}

// Under the title in a list row: where the admin review stands, else who can see the address.
export function StatusLine({ place, t }: { place: PlaceView; t: Dict }) {
  if (place.status === 'refused') return <span className="text-sm font-bold text-danger">{t.review.refusedShort}</span>
  if (place.status === 'pending') return <span className="text-sm font-bold text-clay">{t.review.pendingShort}</span>
  return <span className="text-sm text-muted">{t.visibility.short[place.visibility]}</span>
}

function Reason({ label, text }: { label: string; text: string }) {
  return (
    <p className="break-words text-base">
      <span className="font-bold">{label} : </span>
      {text}
    </p>
  )
}
