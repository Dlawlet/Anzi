import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeText, photonSearch, searchPlaces } from './geocode'

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

const photonAnswer = {
  features: [
    { geometry: { coordinates: [11.5, 3.84] }, properties: { name: "Lycée Bilingue d'Etoug-Ebé", district: 'Etoug-Ebé', city: 'Yaoundé', state: 'Centre', osm_type: 'W', osm_id: 42 } },
    { geometry: { coordinates: [11.5, 3.85] }, properties: { street: 'Rue Antoinette', housenumber: '46', city: 'Yaoundé' } },
    { geometry: { coordinates: [11.5, 3.85] }, properties: {} },
  ],
}

describe('photonSearch', () => {
  it('maps OpenStreetMap features, keeps the name or street + number, drops empty ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => photonAnswer })
    vi.stubGlobal('fetch', fetchMock)
    const out = await photonSearch("lycee bilingue d'etoug ebe")
    expect(out.map((f) => f.title)).toEqual(["Lycée Bilingue d'Etoug-Ebé", '46 Rue Antoinette'])
    expect(out[0]).toMatchObject({ id: 'osm:W42', city: 'Etoug-Ebé, Yaoundé', lat: 3.84, lng: 11.5 })
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('photon.komoot.io')
    expect(url).toContain('bbox=')
  })

  it('searchPlaces uses Mapbox only when OpenStreetMap has nothing', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    const fetchMock = vi.fn(async (url: string): Promise<unknown> =>
      url.includes('photon') ? { ok: true, json: async () => ({ features: [] }) } : { ok: true, json: async () => mapboxAnswer }
    )
    vi.stubGlobal('fetch', fetchMock)
    const out = await searchPlaces('rue antoinette')
    expect(out[0].title).toBe('Rue Antoinette')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    fetchMock.mockClear()
    fetchMock.mockResolvedValue({ ok: true, json: async () => photonAnswer })
    await searchPlaces('lycee')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
