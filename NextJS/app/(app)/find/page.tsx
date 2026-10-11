import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import FindFlow from '@/components/app/find-flow'
import AppBar from '@/components/app/app-bar'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.find.title} - ${t.brand}`, description: t.meta.description }
}

export default async function FindPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; code?: string | string[] }> }) {
  const { q, code } = await searchParams
  // `q` comes from the home search box, `code` from shared links. Only a short plain string is accepted; the API validates it again.
  const raw = typeof q === 'string' ? q : code
  const initialQuery = typeof raw === 'string' && raw.trim() && raw.length <= 80 ? raw : undefined
  return (
    <>
      <AppBar />
      <div className="col-narrow px-4 pt-6"><FindFlow initialCode={initialQuery} /></div>
    </>
  )
}
