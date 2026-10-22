'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useI18n } from '@/i18n/provider'
import { SearchIcon } from './icons'
import { StreetSuggestions, useStreetSuggestions } from './street-suggestions'

// One box, a plain GET form to /find. "Manguier 12", street and number, or the backup code. Street names are
// completed as you type; the form still works without JavaScript.
export default function AddressSearchBox({ defaultValue }: { defaultValue?: string }) {
  const { t } = useI18n()
  const [value, setValue] = useState(defaultValue ?? '')
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const { items, accept } = useStreetSuggestions(value)
  return (
    <form action="/find" method="get" className="px-3.5 pb-4 pt-3.5">
      <label htmlFor="home-q" className="mb-2 flex items-center gap-2 text-base font-bold">
        <SearchIcon className="h-5 w-5" />
        {t.home.searchLabel}
      </label>
      <div className="field-box">
        <input
          ref={input}
          id="home-q"
          name="q"
          type="text"
          required
          maxLength={80}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t.home.searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-night-900 placeholder:text-muted focus:ring-0"
        />
        <button type="submit" className="flex h-12 flex-none items-center gap-1.5 rounded-[10px] bg-night-900 px-4 text-base font-bold text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun">
          {t.home.searchButton}
        </button>
      </div>
      <StreetSuggestions
        items={items}
        label={t.home.searchLabel}
        onPick={(item) => {
          const next = accept(item)
          setValue(next)
          // A place from the map is a finished answer: go and show it. A street name waits for its number.
          if (item.map) router.push(`/find?q=${encodeURIComponent(next)}`)
          else input.current?.focus()
        }}
      />
      <p className="mt-1.5 text-[15px] text-muted">{t.home.searchHelp}</p>
    </form>
  )
}
