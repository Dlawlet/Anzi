import { PinHouseIcon } from './icons'
import { addressLine, addressTitle } from '@/utils/share'
import type { Dict } from '@/i18n/dictionary'
import type { PlaceView } from '@/types/place'
import { fmt } from '@/i18n/lang'

// The shareable address card: name, code, landmark. No site URL, no QR (CLAUDE.md). All text is rendered as text.
export default function PlaceCard({ place, t }: { place: PlaceView; t: Dict }) {
  const title = addressTitle(place, t.card)
  const where = [place.quarter, place.city].filter(Boolean).join(', ')
  const category = (t.categories as Record<string, string>)[place.category]

  return (
    <article className="rounded-2xl border-2 border-green-700 bg-green-50 p-5">
      <div className="flex items-center gap-2 text-green-800">
        <PinHouseIcon className="h-6 w-6" />
        <span className="text-base font-semibold">{t.brand}{category ? ` · ${category}` : ''}</span>
      </div>
      <h2 className="mt-3 break-words text-2xl font-bold leading-snug text-gray-900">{title}</h2>
      {title !== place.name && <p className="mt-1 break-words text-base font-semibold text-gray-900">{place.name}</p>}
      {where && <p className="mt-1 break-words text-base text-gray-700">{where}</p>}
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
