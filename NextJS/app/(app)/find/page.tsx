import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import FindFlow from '@/components/app/find-flow'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.find.title} - ${t.brand}`, description: t.meta.description }
}

export default async function FindPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams
  // Only a short plain string is accepted as a deep-linked code; the API validates it again.
  const initialCode = typeof code === 'string' && code.length <= 20 ? code : undefined
  return <FindFlow initialCode={initialCode} />
}
