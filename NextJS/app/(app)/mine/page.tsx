import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import MineFlow from '@/components/app/mine-flow'
import AppBar from '@/components/app/app-bar'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.mine.title} - ${t.brand}`, description: t.meta.description }
}

export default function MinePage() {
  return (
    <>
      <AppBar />
      <div className="col-narrow px-4 pt-6"><MineFlow /></div>
    </>
  )
}
