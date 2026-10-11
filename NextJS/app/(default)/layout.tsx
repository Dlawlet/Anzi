'use client'

import { useEffect } from 'react'

import AOS from 'aos'
import 'aos/dist/aos.css'

import PageIllustration from '@/components/page-illustration'
import Footer from '@/components/ui/footer'
import LegacyShell from '@/components/legacy-shell'

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode
}) {  

  useEffect(() => {
    AOS.init({
      once: true,
      disable: 'phone',
      duration: 600,
      easing: 'ease-out-sine',
    })
  })

  return (
    <LegacyShell>
      <main className="grow">

        <PageIllustration />

        {children}

      </main>

      <Footer />
    </LegacyShell>
  )
}
