import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import CreateFlow from '@/components/app/create-flow'
import AppBar from '@/components/app/app-bar'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.meta.createTitle} - ${t.brand}`, description: t.meta.description }
}

export default function CreatePage() {
  return (
    <>
      <AppBar />
      <div className="px-4 pt-6"><CreateFlow /></div>
    </>
  )
}
