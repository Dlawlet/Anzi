import { describe, expect, it } from 'vitest'
import { boxAt, chipPlacement, fitView, keepFree, linePath, staticMapUrl, toPercent, toPixel, type MapView } from './staticMap'

const view: MapView = { center: [11.5167, 3.8667], zoom: 15, width: 720, height: 420 }

describe('toPixel / toPercent', () => {
  it('puts the centre in the middle of the image', () => {
    expect(toPixel(view, view.center)).toEqual({ x: 360, y: 210 })
    expect(toPercent(view, view.center)).toEqual({ left: 50, top: 50 })
  })

  it('moves east to the right and north up', () => {
    const east = toPixel(view, [11.518, 3.8667])
    const north = toPixel(view, [11.5167, 3.868])
    expect(east.x).toBeGreaterThan(360)
    expect(north.y).toBeLessThan(210)
  })

  it('matches the Mapbox scale: 512 px tiles, so 0.001 degree of longitude is about 46.6 px at zoom 15', () => {
    const dx = toPixel(view, [11.5167 + 0.001, 3.8667]).x - 360
    expect(dx).toBeCloseTo(46.6, 0)
  })
})

describe('linePath', () => {
  it('writes an SVG path in image pixels', () => {
    expect(linePath(view, [view.center, [11.5177, 3.8667]])).toMatch(/^M360 210L\d+(\.\d)? 210$/)
  })
})

describe('chipPlacement', () => {
  it('tilts a gentle street and flattens a steep one', () => {
    const gentle = chipPlacement(view, [[11.5167, 3.8667], [11.5187, 3.8672]])
    const steep = chipPlacement(view, [[11.5167, 3.8667], [11.5168, 3.8697]])
    expect(Math.abs(gentle.angle)).toBeLessThanOrEqual(30)
    expect(steep.angle).toBe(0)
  })

  it('never turns the text upside down', () => {
    const leftward = chipPlacement(view, [[11.5187, 3.8667], [11.5167, 3.8665]])
    expect(Math.abs(leftward.angle)).toBeLessThanOrEqual(30)
  })
})

describe('keepFree', () => {
  const box = (x: number, y: number) => ({ x, y, w: 40, h: 20 })

  it('keeps the first of two labels that collide and drops the later one', () => {
    const { kept } = keepFree(['a', 'b', 'c'], (id) => ({ a: box(0, 0), b: box(30, 5), c: box(100, 0) })[id as 'a'], [])
    expect(kept).toEqual(['a', 'c'])
  })

  it('also avoids reserved boxes and treats touching edges as free', () => {
    expect(keepFree(['a'], () => box(10, 0), [box(0, 0)]).kept).toEqual([])
    expect(keepFree(['a'], () => box(40, 0), [box(0, 0)]).kept).toEqual(['a'])
  })

  it('boxAt centres the box on the point', () => {
    expect(boxAt(view, view.center, 40, 20)).toEqual({ x: 340, y: 200, w: 40, h: 20 })
  })
})

describe('fitView', () => {
  it('falls back when there is nothing to show', () => {
    expect(fitView([], view)).toBe(view)
  })

  it('zooms in on a short street and keeps a stable, rounded centre', () => {
    const fitted = fitView([[11.5167, 3.8667], [11.5177, 3.8669]], view)
    expect(fitted.zoom).toBeGreaterThanOrEqual(15)
    expect(fitted.zoom).toBeLessThanOrEqual(17)
    expect(fitted.center).toEqual([11.5172, 3.8668])
  })

  it('zooms out for far apart streets, but not below 12', () => {
    const fitted = fitView([[11.4, 3.8], [11.6, 3.95]], view)
    expect(fitted.zoom).toBe(12)
  })
})

describe('staticMapUrl', () => {
  it('builds a plain image URL with the token encoded', () => {
    const url = staticMapUrl(view, 'pk.a b')
    expect(url).toBe('https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/11.5167,3.8667,15,0/720x420?access_token=pk.a%20b')
  })

  it('can ask for the sharper image', () => {
    expect(staticMapUrl(view, 'pk', { retina: true })).toContain('/720x420@2x?')
  })
})
