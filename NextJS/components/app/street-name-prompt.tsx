'use client'

import { fmt, type Lang } from '@/i18n/lang'
import type { Dict } from '@/i18n/dictionary'
import { inputClass } from './ui-classes'
import { GroupIcon } from './icons'

export type NameSuggestion = { id: string; name: string; twin: string; group: string }

// "Nommez votre rue": three suggestion tiles (fruit tree, big tree, bird), a word-language switch, an optional own word.
// Controlled by the create flow, which keeps the chosen name. The name is stored once, in the language it is chosen in.
export default function StreetNamePrompt(props: {
  t: Dict
  suggestions: NameSuggestion[]
  picked: string
  own: string
  ownError: string
  notice: string
  lang: Lang
  onLang: (lang: Lang) => void
  onPick: (name: string) => void
  onOwn: (text: string) => void
  onMore: () => void
}) {
  const { t, suggestions, picked, own, ownError, notice, lang, onLang, onPick, onOwn, onMore } = props
  const s = t.create.street
  const chosen = own.trim() || picked

  return (
    <div className="space-y-5">
      <p className="text-base text-night-900">{s.nameIntro}</p>
      {notice && <p role="status" className="rounded-xl bg-sun-50 p-3 text-base font-semibold text-night-900">{notice}</p>}

      <fieldset>
        <div className="mb-2 flex items-center justify-between gap-3">
          <legend className="text-base font-bold text-night-900">{s.ideas}</legend>
          <div className="flex items-center gap-1.5" role="group" aria-label={s.wordLang}>
            {(['fr', 'en'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onLang(value)}
                aria-pressed={lang === value}
                className={`min-h-11 min-w-11 rounded-full px-3 text-base font-extrabold ${lang === value ? 'bg-night-900 text-white' : 'bg-white text-night-900 shadow-[inset_0_0_0_2px_#857A70]'}`}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {suggestions.map((item) => {
            const on = !own.trim() && picked === item.name
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => onPick(item.name)}
                className={`flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-center ${on ? 'choice-on' : 'border-field bg-white'}`}
              >
                <GroupIcon group={item.group} className="h-7 w-7 text-clay" />
                <span className="break-words text-[17px] font-extrabold leading-tight">{item.name}</span>
                <span className="text-sm text-muted">{(s.groups as Record<string, string>)[item.group]}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={onMore} className="mt-2 inline-flex min-h-12 items-center px-1 text-base font-bold text-clay-700 underline">
          {s.otherIdeas}
        </button>
      </fieldset>

      <div>
        <label htmlFor="own-street" className="mb-1 block text-base font-bold text-night-900">
          {s.ownLabel} <span className="font-normal text-muted">({t.common.optional})</span>
        </label>
        <input
          id="own-street"
          type="text"
          autoComplete="off"
          maxLength={24}
          value={own}
          onChange={(e) => onOwn(e.target.value)}
          aria-invalid={Boolean(ownError)}
          aria-describedby={ownError ? 'own-street-error' : undefined}
          className={inputClass(Boolean(ownError))}
        />
        {ownError && <p id="own-street-error" className="mt-1 text-base font-bold text-danger">{ownError}</p>}
      </div>

      <p className="text-base text-muted">{chosen ? fmt(s.note, { name: chosen }) : fmt(s.noteNone, { n: '4' })}</p>
    </div>
  )
}
