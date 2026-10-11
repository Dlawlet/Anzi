import Link from 'next/link'
import { getI18n } from '@/i18n/server'
import { PinPlusIcon } from './icons'

// Dark brand band of Home: eyebrow, headline with the orange underlined word, lead, one primary button.
// It stretches under the map card, which overlaps its bottom (see app/(app)/page.tsx).
export default async function HeroBand() {
  const { t } = await getI18n()
  return (
    <section className="hero-band">
      <p className="font-architects-daughter text-xl leading-tight text-sun">{t.home.eyebrow}</p>
      <h1 className="mb-2.5 mt-1 text-[31px] font-extrabold leading-[1.1] tracking-[-0.03em]">
        {t.home.headlineA}
        <span className="hl">{t.home.headlineHl}</span>
        {t.home.headlineB}
      </h1>
      <p className="mb-5 text-night-300">{t.home.lead}</p>
      <Link href="/create" className="btn btn-primary">
        <span className="btn-icon"><PinPlusIcon className="h-[22px] w-[22px]" /></span>
        {t.home.cta}
      </Link>
    </section>
  )
}
