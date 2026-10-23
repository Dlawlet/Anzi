'use client'

import { useSyncExternalStore } from 'react'
import { useI18n } from '@/i18n/provider'
import { popupMode, promptInstall, setInstallPopup, subscribeInstall } from '@/utils/installPrompt'
import { primaryButton, secondaryButton } from './ui-classes'
import { ShareIcon } from './icons'
import Logo from './logo'

// Large install popup on phones where Anzi is not installed yet. Android: it appears as soon as the browser says the
// app is installable; "Installer Anzi" opens the browser's install dialog. iPhone (no install API for websites):
// it shows the two Share steps. "Plus tard" closes it until the next visit; the top-bar button reopens it.
export default function InstallPopup() {
  const { t } = useI18n()
  const mode = useSyncExternalStore(subscribeInstall, popupMode, () => null)
  const s = t.install

  if (!mode) return null

  const close = () => setInstallPopup(false)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-night-900/60 md:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-night-900 shadow-warm2 md:rounded-3xl"
      >
        <Logo size={64} />
        <h2 id="install-title" className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{s.title}</h2>
        <p className="mt-2 text-base text-muted">{s.text}</p>

        {mode === 'ios' && (
          <ol className="mt-4 list-decimal space-y-1 pl-6 text-base">
            <li>
              {s.ios1} <ShareIcon className="inline h-5 w-5 align-text-bottom text-clay-700" />
            </li>
            <li>{s.ios2}</li>
          </ol>
        )}
        {mode === 'in-app' && <p className="mt-4 text-base font-bold">{s.inApp}</p>}

        <div className="mt-6 flex flex-col gap-3">
          {mode === 'button' && (
            <button type="button" autoFocus onClick={() => void promptInstall()} className={`${primaryButton} w-full`}>
              {s.install}
            </button>
          )}
          <button type="button" autoFocus={mode !== 'button'} onClick={close} className={`${secondaryButton} w-full`}>
            {mode === 'button' ? s.later : s.ok}
          </button>
        </div>
      </div>
    </div>
  )
}
