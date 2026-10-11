import type { Metadata } from 'next'
import Link from 'next/link'
import { getI18n } from '@/i18n/server'
import AppBar from '@/components/app/app-bar'
import Credits from '@/components/app/credits'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.about.title} - ${t.brand}`, description: t.about.intro }
}

// The contact address is set per deployment (NextJS/.env.local, Vercel); without it the page says it is coming.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null

// About and contact: what Anzi is, why street names are community names, what is kept, how to reach us.
export default async function AboutPage() {
  const { t } = await getI18n()
  const a = t.about
  const sections = [
    { title: a.howTitle, text: a.how },
    { title: a.streetsTitle, text: a.streets },
    { title: a.freeTitle, text: a.free },
    { title: a.privacyTitle, text: a.privacy },
  ]

  return (
    <>
      <AppBar />
      <div className="col-narrow px-4 pb-6 pt-6">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{a.title}</h1>
        <p className="mt-3 text-lg text-night-900">{a.intro}</p>

        <div className="mt-6 space-y-5">
          {sections.map(({ title, text }) => (
            <section key={title} className="rounded-2xl bg-white p-4 shadow-[inset_0_0_0_2px_#E7DED3]">
              <h2 className="text-xl font-extrabold leading-snug">{title}</h2>
              <p className="mt-1.5 text-base text-night-900">{text}</p>
            </section>
          ))}

          <section aria-labelledby="about-contact" className="rounded-2xl bg-night-900 p-4 text-white">
            <h2 id="about-contact" className="text-xl font-extrabold leading-snug">{a.contactTitle}</h2>
            <p className="mt-1.5 text-base text-night-300">{a.contact}</p>
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 inline-flex min-h-12 items-center break-all text-[17px] font-bold text-sun-200 underline">
                {CONTACT_EMAIL}
              </a>
            ) : (
              <p className="mt-3 text-base font-semibold text-sun-200">{a.contactSoon}</p>
            )}
          </section>
        </div>

        <Link href="/" className="mt-5 inline-flex min-h-12 items-center text-base font-bold text-clay-700 underline">{a.home}</Link>
      </div>
      <Credits />
    </>
  )
}
