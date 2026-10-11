import { describe, expect, it } from 'vitest'
import { drawAddressCard, wrapLines, type CardData } from './addressCard'

// A canvas stand-in: 10 px per character, and a log of every string drawn.
function fakeCtx() {
  const drawn: string[] = []
  const handler: ProxyHandler<object> = {
    get(target, prop: string) {
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 })
      if (prop === 'fillText') return (text: string) => void drawn.push(text)
      if (prop in target) return (target as Record<string, unknown>)[prop]
      return () => {}
    },
    set(target, prop: string, value) {
      ;(target as Record<string, unknown>)[prop] = value
      return true
    },
  }
  return { ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D, drawn }
}

const data: CardData = {
  brand: 'Anzi', addressLabel: 'Adresse', category: 'Salon', number: '12', pending: 'N° bientôt', word: 'Rue', name: 'Manguier',
  wordAfter: false, where: 'Bastos · Yaoundé', placeName: 'Salon Rose', landmarkLabel: 'Repère', landmark: 'portail jaune derrière la pharmacie',
  note: 'Adresse non officielle, créée par son propriétaire.',
}

describe('wrapLines', () => {
  it('wraps on words and ends the last line with an ellipsis when it does not fit', () => {
    const { ctx } = fakeCtx()
    expect(wrapLines(ctx, 'aaa bbb ccc', 70, 3)).toEqual(['aaa bbb', 'ccc'])
    expect(wrapLines(ctx, 'aaa bbb ccc ddd eee', 70, 2)).toEqual(['aaa bbb', 'ccc dd…'])
    expect(wrapLines(ctx, 'verylongwordthatnevers', 50, 2)).toEqual(['verylongwordthatnevers'])
  })
})

describe('drawAddressCard', () => {
  it('draws the address, the place and the landmark, and nothing else', () => {
    const { ctx, drawn } = fakeCtx()
    drawAddressCard(ctx, data, null, 'sans-serif')
    const text = drawn.join(' | ')
    for (const part of ['Anzi', 'ADRESSE', '12', 'RUE', 'MANGUIER', 'Bastos · Yaoundé', 'Salon Rose', 'Repère : portail jaune']) expect(text).toContain(part)
    // No code, site address or QR on the card.
    expect(text).not.toMatch(/https?:|www\.|\.com|\.app|[A-Z]{3}-[A-Z0-9]{4}/)
  })

  it('shows the pending note instead of a number', () => {
    const { ctx, drawn } = fakeCtx()
    drawAddressCard(ctx, { ...data, number: null }, null, 'sans-serif')
    expect(drawn).toContain('–')
    expect(drawn).toContain('N° bientôt')
  })

  it('puts the word after the name for English', () => {
    const { ctx, drawn } = fakeCtx()
    drawAddressCard(ctx, { ...data, word: 'Street', wordAfter: true }, null, 'sans-serif')
    expect(drawn.indexOf('MANGUIER')).toBeLessThan(drawn.indexOf('STREET'))
  })
})
