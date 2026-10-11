// Shared Tailwind class strings for the product screens (light theme, 48px touch targets, 16px text).
export const inputClass = (invalid: boolean) =>
  `block w-full min-h-12 rounded-lg border bg-white px-3 py-3 text-base text-gray-900 focus:border-green-700 focus:ring-2 focus:ring-green-700 ${invalid ? 'border-red-700' : 'border-gray-400'}`
export const primaryButton =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-3 text-base font-semibold text-white hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-60'
export const secondaryButton =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-green-700 bg-white px-4 py-3 text-base font-semibold text-green-800 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700'
export const linkButton =
  'inline-flex min-h-12 items-center px-2 text-base font-medium text-gray-700 underline hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700'
