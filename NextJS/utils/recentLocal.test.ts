import { describe, expect, it } from 'vitest'
import { MAX_RECENT, pushRecent, type Recent } from './recentLocal'
import { searchLocal } from './findClient'
import type { PlaceView } from '../types/place'

const item = (label: string, lat = 3.8, lng = 11.5): Recent => ({ q: label, label, sub: 'Bastos', lat, lng })

describe('pushRecent', () => {
  it('puts the newest first and drops a repeat of the same place', () => {
    const list = pushRecent(pushRecent([], item('12 Rue Manguier')), item('4 Rue Avocat', 3.9, 11.6))
    expect(list.map((r) => r.label)).toEqual(['4 Rue Avocat', '12 Rue Manguier'])
    expect(pushRecent(list, item('12 Rue Manguier')).map((r) => r.label)).toEqual(['12 Rue Manguier', '4 Rue Avocat'])
  })

  it('keeps only the latest few', () => {
    let list: Recent[] = []
    for (let i = 0; i < MAX_RECENT + 4; i++) list = pushRecent(list, item(`${i + 2} Rue Test`, 3 + i, 11))
    expect(list).toHaveLength(MAX_RECENT)
    expect(list[0].label).toBe(`${MAX_RECENT + 5} Rue Test`)
  })
})

describe('searchLocal', () => {
  const place = {
    code: 'YDE-7K4M', name: 'Chez moi', category: 'home', street: { id: 's', name: 'Manguier', lang: 'fr', nameStatus: 'accepted', nameSource: 'community', quarter: 'Bastos', city: 'Yaoundé' },
    houseNumber: 12, houseSuffix: '', side: 'even', numberStatus: 'issued', officialNumber: '', quarter: 'Bastos', city: 'Yaoundé', region: 'Centre',
    landmark: '', lng: 11.5, lat: 3.8, accuracyM: 10, visibility: 'link', isOwner: false,
  } as PlaceView

  it('answers a street + number or a code from this phone', () => {
    expect(searchLocal('rue des Manguiers 12', [place])).toHaveLength(1)
    expect(searchLocal('yde 7k4m', [place])).toHaveLength(1)
    expect(searchLocal('Manguier 14', [place])).toHaveLength(0)
    expect(searchLocal('Salon', [place])).toHaveLength(0)
  })
})
