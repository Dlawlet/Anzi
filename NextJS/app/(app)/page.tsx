import Link from 'next/link'
import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import HomeMine from '@/components/app/home-mine'
import { PlusIcon, SearchIcon } from '@/components/app/icons'
import { inputClass, primaryButton } from '@/components/app/ui-classes'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.brand} - ${t.home.tagline}`, description: t.meta.description }
}

// No client JS here except the list of this phone's addresses: the search box is a plain GET form.
export default async function Home() {
  const { t } = await getI18n()

  return (
    <div>
      <h1 className="text-3xl font-bold leading-tight">{t.home.tagline}</h1>

      <div className="mt-6">
        <Link href="/create" className={primaryButton}>
          <PlusIcon className="h-6 w-6" />
          {t.create.title}
        </Link>
        <p className="mt-2 text-base text-gray-700">{t.home.createHint}</p>
      </div>

      <section aria-labelledby="home-find" className="mt-8">
        <h2 id="home-find" className="text-xl font-bold">{t.home.findTitle}</h2>
        <form action="/find" method="get" className="mt-3 space-y-3">
          <label htmlFor="q" className="block text-base font-semibold text-gray-900">{t.find.label}</label>
          <input
            id="q"
            name="q"
            type="text"
            required
            maxLength={80}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t.find.hint}
            className={inputClass(false)}
          />
          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-green-700 bg-white px-4 py-3 text-base font-semibold text-green-800 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          >
            <SearchIcon className="h-6 w-6" />
            {t.find.button}
          </button>
        </form>
      </section>

      <HomeMine />
    </div>
  )
}
