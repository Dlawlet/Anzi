import { describe, expect, it } from 'vitest'
import { completeWith, shouldSuggest } from './suggestClient'

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
