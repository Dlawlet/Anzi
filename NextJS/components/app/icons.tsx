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

// Added for the Anzi redesign (docs/design-2026-10.md section 2.6).
export const PinPlusIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><path d="M12 6.5v7M8.5 10h7" /></svg>
)
export const RoadIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M4 21 9 3M20 21 15 3M12 6v2M12 11v2M12 16v2" /></svg>
)
export const BookmarkIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M6 3h12v18l-6-4-6 4V3Z" /><path d="M9.5 9h5" /></svg>
)
export const ExpandIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
)
export const ShrinkIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M14 10l7-7M10 14l-7 7M20 10h-6V4M4 14h6v6" /></svg>
)
export const HomeIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
)
export const ShopIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M4 9.5 5.2 4h13.6L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12.5V20h13v-7.5" /><path d="M10 20v-4.5h4V20" /></svg>
)
export const ScissorsIcon = ({ className }: Props) => (
  <svg {...base} className={className}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.2 8.2 20 20M8.2 15.8 20 4" /></svg>
)
export const FoodIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3" /><path d="M17 21V3c-2 0-3.5 2.5-3.5 6s1.5 4 3.5 4" /></svg>
)
export const OfficeIcon = ({ className }: Props) => (
  <svg {...base} className={className}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></svg>
)
export const DotsIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
)
export const ChevronIcon = ({ className }: Props) => (
  <svg {...base} className={className}><path d="m9 6 6 6-6 6" /></svg>
)
// Generic speech-bubble glyph, not the WhatsApp trademark artwork.
export const ChatIcon = ({ className }: Props) => (
  <svg {...base} className={className} fill="currentColor" stroke="none"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.6 21.4l4.7-1.2A9.5 9.5 0 1 0 12 2.5Zm0 1.8a7.7 7.7 0 1 1-4.1 14.2l-.3-.2-2.6.7.7-2.5-.2-.3A7.7 7.7 0 0 1 12 4.3Z" /><path d="M9.1 7.3c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2s.9 2.5 1 2.7c.2.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.5.3-.5v-.5l-.9-1.9Z" /></svg>
)

const CATEGORY_ICONS: Record<string, (props: Props) => React.JSX.Element> = {
  home: HomeIcon,
  shop: ShopIcon,
  salon: ScissorsIcon,
  restaurant: FoodIcon,
  office: OfficeIcon,
  other: DotsIcon,
}
export const CategoryIcon = ({ category, className }: Props & { category: string }) => {
  const Icon = CATEGORY_ICONS[category] ?? DotsIcon
  return <Icon className={className} />
}
