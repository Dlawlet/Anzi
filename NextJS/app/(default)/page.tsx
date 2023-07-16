export const metadata = {
  title: 'Home - Anzi!',
  description: 'Anzi is a project that aims to provide a simple and easy to use solution for the problem of finding addresses African countries.',
}

import Hero from '@/components/hero'
import Features from '@/components/features'
import Newsletter from '@/components/newsletter'
import Zigzag from '@/components/zigzag'

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Zigzag />
      <Newsletter />
    </>
  )
}
