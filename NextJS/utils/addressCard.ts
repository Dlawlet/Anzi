// The shareable PNG address card (Canvas 2D, no dependency): logo, orange plate with the number and the street,
// quarter and city, landmark. It never carries the Anzi code, a site address or a QR (CLAUDE.md). Every string is
// drawn as text. Same look as the success screen (docs/design-2026-10.md).

export const CARD_W = 1080
export const CARD_H = 1350

export type CardData = {
  brand: string
  addressLabel: string
  category: string
  number: string | null
  pending: string // shown instead of the number while it waits
  word: string // "Rue" / "Street"
  name: string // street name
  wordAfter: boolean // English reads "Manguier Street"
  where: string // "Bastos · Yaoundé"
  placeName: string
  landmarkLabel: string
  landmark: string
  note: string
}

const COLOR = { night900: '#151719', night800: '#25282C', night700: '#33363A', night400: '#9BA9B4', night300: '#C5D2DC', sun: '#FF8506', sun200: '#FFE2BF', sun50: '#FFF3E3', clay: '#A95700', earth: '#42210B' }

type Ctx = CanvasRenderingContext2D

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Greedy word wrap; the last allowed line ends with an ellipsis when the text does not fit.
export function wrapLines(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last}…`
  return kept
}

// Largest font size (down to `min`) at which the text fits the width on at most `maxLines` lines.
function fitFont(ctx: Ctx, text: string, weight: number, family: string, start: number, min: number, maxWidth: number, maxLines: number) {
  for (let size = start; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`
    if (wrapLines(ctx, text, maxWidth, maxLines).join(' ') === text.split(/\s+/).filter(Boolean).join(' ')) return size
  }
  ctx.font = `${weight} ${min}px ${family}`
  return min
}

export function drawAddressCard(ctx: Ctx, d: CardData, logo: CanvasImageSource | null, family: string) {
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = COLOR.night900
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Card body
  ctx.fillStyle = COLOR.night800
  roundRect(ctx, 50, 50, CARD_W - 100, CARD_H - 100, 56)
  ctx.fill()

  // Logo badge, brand, category
  const x0 = 110
  ctx.fillStyle = COLOR.sun50
  roundRect(ctx, x0, 110, 116, 116, 32)
  ctx.fill()
  if (logo) ctx.drawImage(logo, x0 + 30, 126, 56, 84) // the mark is 183x256
  ctx.fillStyle = '#fff'
  ctx.font = `800 62px ${family}`
  ctx.fillText(d.brand, x0 + 146, 190)
  if (d.category) {
    ctx.font = `700 34px ${family}`
    const w = ctx.measureText(d.category).width + 56
    ctx.fillStyle = COLOR.sun200
    roundRect(ctx, CARD_W - 110 - w, 134, w, 68, 34)
    ctx.fill()
    ctx.fillStyle = COLOR.earth
    ctx.textAlign = 'center'
    ctx.fillText(d.category, CARD_W - 110 - w / 2, 181)
    ctx.textAlign = 'left'
  }

  // Label
  ctx.fillStyle = COLOR.night400
  ctx.font = `800 34px ${family}`
  const spaced = ctx as Ctx & { letterSpacing?: string }
  if ('letterSpacing' in ctx) spaced.letterSpacing = '5px'
  ctx.fillText(d.addressLabel.toUpperCase(), x0, 318)
  if ('letterSpacing' in ctx) spaced.letterSpacing = '0px'

  // Plate: number | divider | street word over the name
  const px = x0
  const py = 352
  const pw = CARD_W - 2 * x0
  const ph = 300
  ctx.fillStyle = COLOR.clay
  roundRect(ctx, px, py, pw, ph, 40)
  ctx.fill()
  ctx.fillStyle = COLOR.sun
  roundRect(ctx, px, py, pw, ph - 12, 40)
  ctx.fill()
  for (const [sx, sy] of [[px + 30, py + 30], [px + pw - 30, py + 30], [px + 30, py + ph - 52], [px + pw - 30, py + ph - 52]]) {
    ctx.fillStyle = COLOR.sun200
    ctx.beginPath()
    ctx.arc(sx, sy, 9, 0, Math.PI * 2)
    ctx.fill()
  }

  const numberText = d.number ?? '–'
  const numberSize = d.number && d.number.length > 3 ? 120 : 168
  ctx.fillStyle = COLOR.night900
  ctx.font = `800 ${numberSize}px ${family}`
  const numberW = ctx.measureText(numberText).width
  const midY = py + (ph - 12) / 2
  ctx.fillText(numberText, px + 64, midY + numberSize * 0.35)
  const dividerX = px + 64 + numberW + 44
  ctx.fillStyle = 'rgba(21,23,25,.3)'
  roundRect(ctx, dividerX, midY - 80, 5, 160, 3)
  ctx.fill()

  const textX = dividerX + 44
  const textW = px + pw - 56 - textX
  ctx.fillStyle = COLOR.night900
  const nameSize = fitFont(ctx, d.name.toUpperCase(), 800, family, 84, 44, textW, 2)
  const nameLines = wrapLines(ctx, d.name.toUpperCase(), textW, 2)
  const wordSize = 38
  const block = nameLines.length * nameSize * 1.05 + wordSize + 14
  let y = midY - block / 2
  const drawWord = () => {
    ctx.font = `800 ${wordSize}px ${family}`
    if ('letterSpacing' in ctx) spaced.letterSpacing = '6px'
    y += wordSize
    ctx.fillText(d.word.toUpperCase(), textX, y)
    if ('letterSpacing' in ctx) spaced.letterSpacing = '0px'
  }
  const drawName = () => {
    ctx.font = `800 ${nameSize}px ${family}`
    for (const line of nameLines) {
      y += nameSize * 1.05
      ctx.fillText(line, textX, y - nameSize * 0.08)
    }
  }
  if (d.wordAfter) {
    drawName()
    y += 14
    drawWord()
  } else {
    drawWord()
    y += 14
    drawName()
  }
  if (!d.number) {
    ctx.fillStyle = COLOR.night900
    ctx.font = `700 30px ${family}`
    ctx.fillText(d.pending, px + 64, py + ph - 40)
  }

  // Quarter and city, place name
  let ty = py + ph + 96
  ctx.fillStyle = '#fff'
  const whereSize = fitFont(ctx, d.where, 800, family, 62, 40, CARD_W - 2 * x0, 2)
  for (const line of wrapLines(ctx, d.where, CARD_W - 2 * x0, 2)) {
    ctx.fillText(line, x0, ty)
    ty += whereSize * 1.2
  }
  ctx.fillStyle = COLOR.night300
  ctx.font = `500 42px ${family}`
  for (const line of wrapLines(ctx, d.placeName, CARD_W - 2 * x0, 2)) {
    ty += 6
    ctx.fillText(line, x0, ty + 36)
    ty += 48
  }

  // Landmark
  if (d.landmark) {
    ty += 36
    ctx.font = `500 40px ${family}`
    const lines = wrapLines(ctx, `${d.landmarkLabel} : ${d.landmark}`, CARD_W - 2 * x0 - 64, 4)
    const boxH = lines.length * 54 + 52
    ctx.fillStyle = COLOR.night700
    roundRect(ctx, x0, ty, CARD_W - 2 * x0, boxH, 32)
    ctx.fill()
    ctx.fillStyle = '#fff'
    lines.forEach((line, i) => {
      ctx.fillText(line, x0 + 32, ty + 26 + 42 + i * 54)
    })
  }

  // Note at the bottom
  ctx.fillStyle = COLOR.night400
  ctx.font = `500 30px ${family}`
  const note = wrapLines(ctx, d.note, CARD_W - 2 * x0, 2)
  note.forEach((line, i) => ctx.fillText(line, x0, CARD_H - 120 - (note.length - 1 - i) * 40))
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

// Renders the card to a PNG. Browser only.
export async function addressCardBlob(d: CardData): Promise<Blob> {
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
  try {
    await Promise.all([800, 700, 500].map((weight) => document.fonts.load(`${weight} 40px ${family}`)))
  } catch {
    // the fallback font is fine
  }
  const logo = await loadImage('/brand/anzi-logo.png')
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  drawAddressCard(ctx, d, logo, family)
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no blob'))), 'image/png'))
}

// Phones: the share sheet (WhatsApp, gallery, files). Elsewhere, or when sharing a file is not supported: a download.
export async function saveAddressCard(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const phone = window.matchMedia?.('(pointer: coarse)').matches
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}

export const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

// Opens the system share sheet (WhatsApp with its contact list, Messages, ...) with the card image and the text.
// Without a usable image the text goes alone. 'unsupported' means the caller should fall back to a wa.me link.
export async function shareAddress(blob: Blob | null, filename: string, title: string, text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canNativeShare()) return 'unsupported'
  const file = blob ? new File([blob], filename, { type: 'image/png' }) : null
  const data: ShareData = file && navigator.canShare?.({ files: [file] }) ? { files: [file], title, text } : { title, text }
  try {
    await navigator.share(data)
    return 'shared'
  } catch (error) {
    return (error as Error).name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}
