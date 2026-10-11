import type { MetadataRoute } from 'next'

// Installable app ("Add to home screen"): people open Anzi from an icon and never see the site address.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Anzi',
    short_name: 'Anzi',
    description: 'Une adresse simple et un code à partager pour être trouvé facilement.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FBF6EF',
    theme_color: '#151719',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
