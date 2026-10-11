'use client'

import { useState } from 'react'
import type { Dict } from '@/i18n/dictionary'
import { fmt } from '@/i18n/lang'
import { whatsappUrl } from '@/utils/share'
import { CopyIcon, ShareIcon } from './icons'

// The management key, shown once after creation. It is the only way to get the address back on another phone
// (no accounts), so the screen asks to copy it or send it to oneself. Never stored in the browser.
export default function ManageKeyBox({ manageKey, address, t }: { manageKey: string; address: string; t: Dict }) {
  const [message, setMessage] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(manageKey)
      setMessage(t.key.copied)
    } catch {
      setMessage(fmt(t.key.copyFailed, { key: manageKey }))
    }
  }

  return (
    <section aria-labelledby="manage-key-title" className="mt-5 rounded-3xl border border-sun/40 bg-night-800 p-4">
      <h2 id="manage-key-title" className="text-lg font-extrabold">{t.key.title}</h2>
      <p className="mt-1 text-base text-night-300">{t.key.text}</p>
      <p className="mt-3 select-all rounded-2xl bg-night-900 px-4 py-3 whitespace-nowrap text-center text-[22px] font-extrabold tracking-[0.06em] text-sun-200" style={{ fontFeatureSettings: "'tnum'" }}>
        {manageKey}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" onClick={copy} className="btn bg-white text-night-900">
          <CopyIcon className="h-6 w-6" />
          {t.key.copy}
        </button>
        <a
          href={whatsappUrl(fmt(t.key.shareText, { address, key: manageKey }))}
          target="_blank"
          rel="noopener noreferrer"
          className="btn bg-leaf text-white"
        >
          <ShareIcon className="h-6 w-6" />
          {t.key.send}
        </a>
      </div>
      <p role="status" className="mt-2 text-center text-base text-sun-200">{message}</p>
    </section>
  )
}
