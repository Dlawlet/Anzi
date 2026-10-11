import { PinHouseIcon } from './icons'
import { addressLine } from '@/utils/share'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { fmt } from '@/i18n/lang'

// The shareable address card: name, code, landmark. No site URL, no QR (CLAUDE.md). All text is rendered as text.
export default function PlaceCard({ place, t }: { place: PlaceView; t: Dict }) {
  const line = addressLine(place, t.card)
  const category = (t.categories as Record<string, string>)[place.category]

  return (
    <article className="rounded-2xl border-2 border-green-700 bg-green-50 p-5">
      <div className="flex items-center gap-2 text-green-800">
        <PinHouseIcon className="h-6 w-6" />
        <span className="text-base font-semibold">{t.brand}{category ? ` · ${category}` : ''}</span>
      </div>
      <h2 className="mt-3 break-words text-2xl font-bold leading-snug text-gray-900">{place.name}</h2>
      {line && <p className="mt-1 break-words text-base text-gray-700">{line}</p>}
      <p className="mt-4 text-sm font-medium text-gray-700">{t.card.code}</p>
      <p className="font-mono text-3xl font-bold tracking-wider text-green-800" aria-label={`${t.card.code} ${place.code}`}>
        {place.code}
      </p>
      {place.landmark && (
        <p className="mt-4 break-words text-base text-gray-900">
          <span className="font-semibold">{t.card.landmark} : </span>
          {place.landmark}
        </p>
      )}
      {place.accuracyM != null && (
        <p className="mt-3 text-sm text-gray-700">{fmt(t.card.precision, { m: Math.round(place.accuracyM) })}</p>
      )}
      <p className="mt-3 text-sm text-gray-700">{t.card.communityNote}</p>
    </article>
  )
}
