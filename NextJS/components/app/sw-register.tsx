'use client'

import { useEffect } from 'react'
import '@/utils/installPrompt' // starts listening for the install event on every app screen

// Registers the service worker in production only (it would get in the way of hot reload).
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // No service worker: the app still works online.
    })
  }, [])
  return null
}
