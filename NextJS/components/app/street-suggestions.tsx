'use client'

import { useEffect, useRef, useState } from 'react'
import { completeWith, fetchSuggestions, shouldSuggest, type Suggestion } from '@/utils/suggestClient'

const DELAY_MS = 200

// Street names that start like the typed text. The list sits inline under the box (not a floating layer), so it
// never hides what is below on small phones. One request per pause in typing, none for short text.
export function useStreetSuggestions(query: string) {
  const [items, setItems] = useState<Suggestion[]>([])
  const accepted = useRef('')

  useEffect(() => {
    const text = query.trim()
    if (!shouldSuggest(text) || text === accepted.current || !navigator.onLine) {
      setItems([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchSuggestions(text, controller.signal, (list) => {
        if (!controller.signal.aborted) setItems(list)
      })
    }, DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // The new box text for a picked suggestion; the list stays closed until the text changes again.
  const accept = (item: Suggestion) => {
    const next = item.map ? item.name : completeWith(query, item.name)
    accepted.current = next.trim()
    setItems([])
    return next
  }
  // Closes the list for the current text (a submitted search needs no more suggestions).
  const dismiss = () => {
    accepted.current = query.trim()
    setItems([])
  }
  return { items, accept, dismiss }
}

export function StreetSuggestions({ items, label, onPick }: { items: Suggestion[]; label: string; onPick: (item: Suggestion) => void }) {
  if (items.length === 0) return null
  return (
    <ul aria-label={label} className="mt-2 divide-y divide-field overflow-hidden rounded-[14px] border-2 border-field bg-white">
      {items.map((item) => (
        <li key={item.map?.id ?? `${item.name}|${item.quarter}|${item.city}`}>
          <button
            type="button"
            onClick={() => onPick(item)}
            className="flex min-h-12 w-full flex-col items-start justify-center px-3.5 py-2 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-clay"
          >
            <span className="text-[17px] font-bold text-night-900">{item.name}</span>
            <span className="text-[15px] text-muted">{[item.quarter, item.city].filter(Boolean).join(' · ')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
