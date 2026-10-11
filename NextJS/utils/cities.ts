// Main cities offered as suggestions, with the region value used by the API (REGIONS in placeValidation.js).
export const CITIES: ReadonlyArray<{ name: string; region: string }> = [
  { name: 'Yaoundé', region: 'Centre' },
  { name: 'Douala', region: 'Littoral' },
  { name: 'Bafoussam', region: 'Ouest' },
  { name: 'Garoua', region: 'Nord' },
  { name: 'Bamenda', region: 'Nord-Ouest' },
  { name: 'Buea', region: 'Sud-Ouest' },
  { name: 'Limbé', region: 'Sud-Ouest' },
  { name: 'Kribi', region: 'Sud' },
  { name: 'Ebolowa', region: 'Sud' },
  { name: 'Bertoua', region: 'Est' },
  { name: 'Maroua', region: 'Extreme-Nord' },
  { name: 'Ngaoundéré', region: 'Adamaoua' },
]

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// Region for a typed city name (accent and case insensitive), or null when unknown.
export function regionForCity(city: string): string | null {
  const key = fold(city)
  return CITIES.find((c) => fold(c.name) === key)?.region ?? null
}
