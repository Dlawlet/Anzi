// "Install Anzi" support. Android browsers (Chrome, Samsung Internet, Edge, Opera) fire `beforeinstallprompt` once
// the app is installable; we keep that event so our own button can open the browser's install dialog later. It is
// captured at module load (imported by SwRegister in the app layout), so it is not lost if it fires before Home renders.
// iPhones have no such event: the button shows the "Share > Add to Home Screen" steps instead.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export type InstallMode = 'button' | 'ios' | 'in-app' | null

let deferred: InstallEvent | null = null
// "Plus tard" hides the popup until the next visit (memory only: a reload brings it back).
let dismissed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

// What the install button should offer on this phone right now (null = nothing). Phones only: touch screen required.
export function installMode(): InstallMode {
  if (!window.matchMedia('(pointer: coarse)').matches || isStandalone()) return null
  if (deferred) return 'button'
  const ua = navigator.userAgent
  // Facebook / Instagram built-in browsers cannot install apps: the user must reopen the page in the real browser.
  if (/FBAN|FBAV|FB_IAB|Instagram/.test(ua)) return 'in-app'
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  return null
}

// The popup shown on load: same offer as the button, unless dismissed during this visit.
export const popupMode = (): InstallMode => (dismissed ? null : installMode())

export function setInstallPopup(open: boolean) {
  dismissed = !open
  notify()
}

// Opens the browser's own install dialog (one more tap to confirm). The event can be used only once.
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  await e.prompt()
  const { outcome } = await e.userChoice
  notify()
  return outcome === 'accepted'
}
