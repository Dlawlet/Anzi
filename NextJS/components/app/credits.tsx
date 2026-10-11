import { getI18n } from '@/i18n/server'
import Logo from './logo'

export default async function Credits() {
  const { t } = await getI18n()
  return (
    <footer className="mx-4 mt-1 flex items-center gap-3 border-t border-line pb-2 pt-4 text-sm text-muted">
      <Logo size={36} onDark />
      <div>
        <b className="text-night-900">{t.brand}</b> · {t.home.credits}
        <br />
        {t.home.creditsNote}
      </div>
    </footer>
  )
}
