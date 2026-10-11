// Shared Tailwind class strings for the product screens (48px+ touch targets, 16px text, charcoal and orange).
export const inputClass = (invalid: boolean) =>
  `block w-full min-h-12 rounded-[14px] border-2 bg-white px-3.5 py-3 text-[17px] text-night-900 focus:border-clay focus:ring-4 focus:ring-sun-200 ${invalid ? 'border-danger' : 'border-field'}`
export const primaryButton = 'btn btn-primary'
export const secondaryButton = 'btn btn-outline'
export const linkButton =
  'inline-flex min-h-12 items-center px-2 text-base font-bold text-clay-700 underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-clay'
