import Link from 'next/link'
import { getI18n } from '@/i18n/server'
import Logo from './logo'
import LangToggle from './lang-toggle'

// 60 px top bar: dark on Home (brand frame), light on working screens.
export default async function AppBar({ variant = 'light' }: { variant?: 'dark' | 'light' }) {
  const { t } = await getI18n()
  const dark = variant === 'dark'
  return (
    <header className={`flex h-[60px] items-center justify-between gap-2 pl-4 pr-3 ${dark ? 'bg-night-900 text-white' : 'bg-white text-night-900 shadow-[0_1px_0_#E7DED3]'}`}>
      <Link href="/" className="flex min-h-12 items-center gap-2.5 text-[23px] font-extrabold tracking-[-0.03em] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun">
        <Logo size={dark ? 40 : 34} onDark={dark} priority />
        {t.brand}
      </Link>
      <LangToggle dark={dark} />
    </header>
  )
}
