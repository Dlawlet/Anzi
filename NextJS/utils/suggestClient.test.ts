import { describe, expect, it, vi } from 'vitest'
import { completeWith, fetchSuggestions, shouldSuggest } from './suggestClient'

describe('shouldSuggest', () => {
  it('needs two letters', () => {
    expect(shouldSuggest('m')).toBe(false)
    expect(shouldSuggest(' 12 ')).toBe(false)
    expect(shouldSuggest('ma')).toBe(true)
    expect(shouldSuggest('12 manguier')).toBe(true)
  })
  it('skips backup codes', () => {
    expect(shouldSuggest('YDE-7K4M')).toBe(false)
  })
})

describe('completeWith', () => {
  it('ends with a space for the number', () => {
    expect(completeWith('mang', 'Manguier')).toBe('Manguier ')
  })
  it('keeps the number already typed', () => {
    expect(completeWith('12 man', 'Manguier')).toBe('Manguier 12')
    expect(completeWith('man 12b', 'Manguier')).toBe('Manguier 12b')
  })
})

describe('fetchSuggestions', () => {
  const ok = (body: unknown) => ({ ok: true, json: async () => body })

  it('merges the three sources and survives a failing one', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.startsWith('/api/find/suggest')) throw new Error('db down')
      if (url.startsWith('/api/lookup')) return ok({ matches: [{ id: 'a1', title: '46 Rue Antoinette', city: 'Yaoundé', lat: 3.8, lng: 11.5 }] })
      if (url.includes('photon')) return ok({ features: [] })
      return ok({ features: [{ id: 'poi.1', text: 'Rue Antoinette', place_name: 'Rue Antoinette, Douala, Cameroun', center: [9.7, 4.05] }] })
    }))
    const out = await fetchSuggestions('antoinette', new AbortController().signal)
    expect(out.map((s) => s.name)).toEqual(['46 Rue Antoinette', 'Rue Antoinette'])
    expect(out.every((s) => s.map)).toBe(true)
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('puts Anzi streets first and drops repeats', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.startsWith('/api/find/suggest')) return ok({ suggestions: [{ name: 'Manguier', lang: 'fr', quarter: 'Bastos', city: 'Yaoundé' }] })
      if (url.startsWith('/api/lookup')) return ok({ matches: [] })
      if (url.includes('photon')) return ok({ features: [] })
      return ok({ features: [{ id: 'p', text: 'Manguier', place_name: 'Manguier, Yaoundé, Cameroun', center: [11.5, 3.8] }] })
    }))
    const out = await fetchSuggestions('mang', new AbortController().signal)
    expect(out).toHaveLength(1)
    expect(out[0].map).toBeUndefined()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
})
