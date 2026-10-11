import type { Metadata } from 'next'
import AdminTool from '@/components/admin/admin-tool'

// Moderator page: not indexed, nothing public links to it, every action needs ADMIN_TOKEN on the API.
export const metadata: Metadata = { title: 'Anzi admin', robots: { index: false, follow: false } }

export default function AdminPage() {
  return <AdminTool />
}
