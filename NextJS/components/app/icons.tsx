// Small inline icons (no icon library). Decorative: always paired with a text label.
type Props = { className?: string }

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const SearchIcon = ({ className }: Props) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const PlusIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
)
export const ListIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
)
// Pin with a house inside: the Anzi mark.
export const PinHouseIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><path d="m9 11 3-2.5 3 2.5v3H9z" /></svg>
)
export const CrosshairIcon = ({ className }: Props) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="7" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
)
export const ShareIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
)
export const CopyIcon = ({ className }: Props) => (
  <svg {...base} className={className}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></svg>
)
export const NavigateIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="m3 11 18-8-8 18-2-8-8-2Z" /></svg>
)
export const CheckIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="m5 12 5 5 9-10" /></svg>
)
