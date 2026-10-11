import Header from '@/components/ui/header'

// Dark frame and header of the original template, kept for the legacy pages until they are retired.
export default function LegacyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-gray-900 text-gray-200">
      <Header />
      {children}
    </div>
  )
}
