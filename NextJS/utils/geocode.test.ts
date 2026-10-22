import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeText } from './geocode'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const mapboxAnswer = {
  features: [
    { id: 'address.1', text: 'Rue Antoinette', place_name: 'Rue Antoinette, Yaoundé, Centre, Cameroun', center: [11.51, 3.86] },
    { id: 'bad', text: 'No position', place_name: 'No position, Douala' },
  ],
}

describe('geocodeText', () => {
  it('maps features to a title, a town and a position, in Cameroon only', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => mapboxAnswer })
    vi.stubGlobal('fetch', fetchMock)
    const out = await geocodeText('rue antoinette')
    expect(out).toEqual([{ id: 'address.1', title: 'Rue Antoinette', city: 'Yaoundé, Centre', lat: 3.86, lng: 11.51 }])
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/mapbox.places/rue%20antoinette.json')
    expect(url).toContain('country=cm')
  })

  it('does nothing without a token or with a one-letter text', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '')
    expect(await geocodeText('manguier')).toEqual([])
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    expect(await geocodeText('m')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns an empty list on errors', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await geocodeText('manguier')).toEqual([])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await geocodeText('manguier')).toEqual([])
  })
})
