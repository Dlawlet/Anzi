import type { Metadata } from 'next'
import { getI18n } from '@/i18n/server'
import MineFlow from '@/components/app/mine-flow'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.mine.title} - ${t.brand}`, description: t.meta.description }
}

export default function MinePage() {
  return <MineFlow />
}
