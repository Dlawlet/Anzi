import Image from 'next/image'

// The owner's compass-pin mark (public/brand/anzi-logo.png, 183x256). On charcoal it always sits in the cream
// badge: the logo is dark brown and nearly invisible straight on dark (docs/design-2026-10.md section 2.4).
const RATIO = 183 / 256

export default function Logo({ size = 40, onDark = false, priority = false }: { size?: number; onDark?: boolean; priority?: boolean }) {
  const height = Math.round(size * (onDark ? 0.75 : 1))
  const width = Math.round(height * RATIO)
  const mark = (
    // Small static PNG: skip the image optimizer (free-tier transformation quota). Tailwind's preflight sets
    // `height: auto`, which rounds off the attribute height and makes Next warn; the size is pinned in style.
    <Image src="/brand/anzi-logo.png" alt="" width={width} height={height} style={{ width, height }} priority={priority} unoptimized />
  )
  if (!onDark) return mark
  return (
    <span
      className="grid flex-none place-items-center bg-sun-50"
      style={{ width: size, height: size, borderRadius: '28%', boxShadow: 'inset 0 -2px 0 rgba(66,33,11,.14)' }}
    >
      {mark}
    </span>
  )
}
