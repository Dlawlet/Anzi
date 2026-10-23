'use client'

import { useSyncExternalStore } from 'react'
import { useI18n } from '@/i18n/provider'
import { installMode, promptInstall, setInstallPopup, subscribeInstall } from '@/utils/installPrompt'
import { PhoneIcon } from './icons'

// "Installer" pill in the top bar, on phones where Anzi is not installed yet. Android: one tap opens the browser's
// install dialog. iPhone and Facebook/Instagram browsers: the tap reopens the install popup with the steps.
export default function InstallButton({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n()
  const mode = useSyncExternalStore(subscribeInstall, installMode, () => null)

  if (!mode) return null

  return (
    <button
      type="button"
      onClick={() => (mode === 'button' ? void promptInstall() : setInstallPopup(true))}
      className={`flex min-h-12 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun ${
        dark ? 'bg-white/10 text-white' : 'bg-sun-50 text-clay-700 shadow-[inset_0_0_0_1px_#E7DED3]'
      }`}
    >
      <PhoneIcon className="h-5 w-5" />
      {t.install.button}
    </button>
  )
}
