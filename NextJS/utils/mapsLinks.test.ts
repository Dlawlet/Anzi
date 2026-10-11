import { describe, expect, it } from 'vitest'
import { appleUrl, coordsText, detectPlatform, geoUrl, googleDirUrl, platformOrder, wazeUrl } from './mapsLinks'

const at = { lat: 3.88712, lng: 11.51845 }

describe('links (examples from design section 4.4)', () => {
  it('geoUrl labels the point and encodes the label', () => {
    expect(geoUrl(at, '12 Rue Manguier')).toBe('geo:0,0?q=3.887120,11.518450(12%20Rue%20Manguier)')
  })
  it('geoUrl escapes parentheses and other URL characters in the label', () => {
    expect(geoUrl(at, 'Chez Paul (bar) & co')).toBe('geo:0,0?q=3.887120,11.518450(Chez%20Paul%20%28bar%29%20%26%20co)')
  })
  it('googleDirUrl', () => {
    expect(googleDirUrl(at)).toBe('https://www.google.com/maps/dir/?api=1&destination=3.887120,11.518450&travelmode=driving')
  })
  it('wazeUrl', () => {
    expect(wazeUrl(at)).toBe('https://waze.com/ul?ll=3.887120,11.518450&navigate=yes')
  })
  it('appleUrl', () => {
    expect(appleUrl(at)).toBe('https://maps.apple.com/?daddr=3.887120,11.518450')
  })
  it('coordsText', () => {
    expect(coordsText(at)).toBe('3.887120, 11.518450')
  })
  it('keeps 6 decimals and the sign for the southern and western hemispheres', () => {
    const p = { lat: -1.5, lng: -70.1234567 }
    expect(coordsText(p)).toBe('-1.500000, -70.123457')
    expect(wazeUrl(p)).toBe('https://waze.com/ul?ll=-1.500000,-70.123457&navigate=yes')
  })
})

describe('detectPlatform', () => {
  it('reads the user agent', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 13; TECNO KG5) Chrome/120 Mobile')).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari')).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('desktop')
  })
  it('treats an iPad that poses as a Mac as iOS, but not a real Mac', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari'
    expect(detectPlatform(mac, 5)).toBe('ios')
    expect(detectPlatform(mac, 0)).toBe('desktop')
  })
})

describe('platformOrder', () => {
  it('Android: phone app, Google Maps, Waze, Apple Maps, copy', () => {
    expect(platformOrder('android')).toEqual(['phone', 'google', 'waze', 'apple', 'copy'])
  })
  it('iPhone: Apple Maps first and no geo: row', () => {
    expect(platformOrder('ios')).toEqual(['apple', 'google', 'waze', 'copy'])
  })
  it('desktop: no geo: row', () => {
    expect(platformOrder('desktop')).toEqual(['google', 'waze', 'apple', 'copy'])
  })
  it('moves the last used row to the top', () => {
    expect(platformOrder('android', 'waze')).toEqual(['waze', 'phone', 'google', 'apple', 'copy'])
    expect(platformOrder('desktop', 'copy')).toEqual(['copy', 'google', 'waze', 'apple'])
  })
  it('ignores a last row that is unknown or not offered on this platform', () => {
    expect(platformOrder('ios', 'phone')).toEqual(['apple', 'google', 'waze', 'copy'])
    expect(platformOrder('ios', 'nonsense')).toEqual(['apple', 'google', 'waze', 'copy'])
    expect(platformOrder('ios', null)).toEqual(['apple', 'google', 'waze', 'copy'])
  })
})
