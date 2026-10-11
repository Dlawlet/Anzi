'use client'

import { fmt } from '@/i18n/lang'
import type { Dict } from '@/i18n/dictionary'
import type { NearStreet } from '@/types/place'
import { PlusIcon, RoadIcon } from './icons'

export const NEW_STREET = 'new'

// Street name as shown to people: "Rue Manguier" (type word from the dictionary), or "Rue sans nom".
export const streetLabel = (t: Dict, name: string) => (name ? fmt(t.create.street.namePicked, { name }) : t.create.street.unnamed)

// The house number the street would give, on an orange mini-plate, with the even/odd side.
export function NumberBox({ t, number, parity }: { t: Dict; number: number; parity: 'even' | 'odd' }) {
  const s = t.create.street
  return (
    <div role="status" className="flex items-center gap-3.5 rounded-2xl bg-night-900 p-3.5 text-white">
      <span className="plate-no !h-[52px] !min-w-[64px] text-[28px]">{number}</span>
      <div>
        <p className="text-[17px] font-extrabold">{fmt(s.number, { n: number })}</p>
        <p className="text-base text-night-300">{fmt(s.numberHint, { side: parity === 'even' ? s.even : s.odd })}</p>
      </div>
    </div>
  )
}

const ring = 'peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay'

// Radio cards of the streets around the user, nearest first, then "New street". Picking one shows the number it gives.
export default function StreetPicker(props: {
  t: Dict
  streets: NearStreet[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { t, streets, selected, onSelect } = props
  const s = t.create.street
  const picked = streets.find((street) => street.id === selected)

  return (
    <fieldset>
      <legend className="sr-only">{s.title}</legend>
      {picked && (
        <div className="mb-3">
          {picked.ideal ? (
            <NumberBox t={t} number={picked.ideal.number} parity={picked.ideal.parity} />
          ) : (
            <p role="status" className="rounded-2xl bg-sun-50 p-3.5 text-base text-night-900">{s.numberLater}</p>
          )}
        </div>
      )}
      <div className="space-y-2">
        {streets.map((street) => {
          const on = selected === street.id
          return (
            <label key={street.id} className="block cursor-pointer">
              <input type="radio" name="street" value={street.id} checked={on} onChange={() => onSelect(street.id)} className="peer sr-only" />
              <span className={`choice ${ring} ${on ? 'choice-on' : ''}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun-200 text-earth"><RoadIcon className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-[17px] font-extrabold">
                    <span className="break-words">{streetLabel(t, street.name)}</span>
                    {street.nameStatus !== 'accepted' && street.name && (
                      <span className="rounded-full border border-dashed border-clay px-2 py-0.5 text-sm font-bold text-clay-700">{s.provisional}</span>
                    )}
                  </span>
                  <span className="block text-base text-muted">{s.count[street.count]} · {fmt(s.away, { d: street.distanceM })}</span>
                </span>
              </span>
            </label>
          )
        })}
        <label className="block cursor-pointer">
          <input type="radio" name="street" value={NEW_STREET} checked={selected === NEW_STREET} onChange={() => onSelect(NEW_STREET)} className="peer sr-only" />
          <span className={`choice ${ring} ${selected === NEW_STREET ? 'choice-on' : ''}`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night-900 text-sun"><PlusIcon className="h-6 w-6" /></span>
            <span>
              <span className="block text-[17px] font-extrabold">{s.newTitle}</span>
              <span className="block text-base text-muted">{s.newHint}</span>
            </span>
          </span>
        </label>
      </div>

    </fieldset>
  )
}
