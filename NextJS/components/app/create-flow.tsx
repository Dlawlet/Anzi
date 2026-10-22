'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n/provider'
import { fmt, type Lang } from '@/i18n/lang'
import type { Dict } from '@/i18n/dictionary'
import { CATEGORIES, REGIONS } from '@/utils/placeValidation.js'
import { CITIES, regionForCity } from '@/utils/cities'
import { GPS_MAX_M, gpsQuality, inCameroon } from '@/utils/gps'
import { mapsViewUrl } from '@/utils/share'
import { saveLocalPlace } from '@/utils/localPlaces'
import { clashesWith, validateStreetName } from '@/utils/streetNames.js'
import { suggestNames } from '@/utils/streetNouns.js'
import type { NearStreet, PlaceView } from '@/types/place'
import CreateDone from './create-done'
import MiniMap from './mini-map'
import PinMap from './pin-map'
import { MAX_PIN_OFFSET_M, metresBetween, metresToTarget } from '@/utils/presence.js'
import StepHeader from './step-header'
import StreetNamePrompt from './street-name-prompt'
import StreetPicker, { NEW_STREET, streetLabel } from './street-picker'
import { inputClass, linkButton, primaryButton, secondaryButton } from './ui-classes'
import { CategoryIcon, ChevronIcon, CheckIcon, CrosshairIcon } from './icons'
import { useGps, type GpsFix } from './use-gps'

type Step = 'where' | 'what' | 'street' | 'details' | 'consent'
type Visibility = 'private' | 'link' | 'public'
type Errors = Record<string, string>
type StreetsState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; offline: boolean }
  | { phase: 'ready'; streets: NearStreet[] }

type Form = {
  category: string
  name: string
  city: string
  region: string
  quarter: string
  landmark: string
  visibility: Visibility
  consent: boolean
  adult: boolean
}

const EMPTY: Form = {
  category: '', name: '', city: '', region: '', quarter: '', landmark: '',
  visibility: 'link', consent: false, adult: false,
}

const STEPS: Step[] = ['where', 'what', 'street', 'details', 'consent']
const VISIBILITY_ORDER: Visibility[] = ['link', 'public', 'private']
// Server field name -> the step that owns it.
const FIELD_STEP: Record<string, Step> = {
  location: 'where', name: 'what', category: 'what', street: 'street', streetName: 'street', city: 'details', region: 'details',
  landmark: 'details', quarter: 'details', visibility: 'consent', consent: 'consent', adultOrParentOk: 'consent',
}

function FieldShell(props: {
  id: string
  label: string
  hint?: string
  error?: string
  note?: string
  children: React.ReactNode
}) {
  const { id, label, hint, error, note, children } = props
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-base font-bold text-night-900">
        {label}
        {note && <span className="ml-1 font-normal text-muted">({note})</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="mb-2 text-base text-muted">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-base font-bold text-danger">{error}</p>}
    </div>
  )
}

const describedBy = (id: string, hint?: boolean, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined

function fieldMessage(t: Dict, field: string): string {
  switch (field) {
    case 'location': return t.create.where.needFix
    case 'name': return t.create.what.nameError
    case 'category': return t.create.what.categoryError
    case 'street': return t.create.street.choose
    case 'streetName': return t.create.street.ownError
    case 'city': return t.create.details.cityError
    case 'region': return t.create.details.regionError
    case 'landmark':
    case 'quarter': return t.create.details.tooLong
    case 'consent': return t.create.consent.agreeError
    case 'adultOrParentOk': return t.create.consent.adultError
    default: return t.create.errors.invalid
  }
}

type Spot = { lat: number; lng: number }

// `target`: a house picked on the main map. The flow only goes on when this phone is near it (testers whose IP
// is trusted by the admin skip that check).
export default function CreateFlow({ target = null }: { target?: Spot | null }) {
  const { t, lang } = useI18n()
  const [step, setStep] = useState<Step>('where')
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // The management key is kept in memory only: it is shown once and never written to browser storage.
  const [created, setCreated] = useState<{ place: PlaceView; manageKey: string } | null>(null)

  // Street step state: the streets around the pin, the chosen one, and the naming of a new street.
  const [streets, setStreets] = useState<StreetsState>({ phase: 'idle' })
  const [choice, setChoice] = useState<string | null>(null)
  const [nameLang, setNameLang] = useState<Lang>(lang)
  const [pickedName, setPickedName] = useState('')
  const [ownName, setOwnName] = useState('')
  const [namePage, setNamePage] = useState(0)
  const [nameNotice, setNameNotice] = useState('')
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000) + 1)
  const streetsFor = useRef('')
  const prefilledFor = useRef('')

  const gps = useGps()
  // The pin the user moved onto the right house; null = the phone's own reading.
  const [pin, setPin] = useState<Spot | null>(null)
  const [exempt, setExempt] = useState(false)

  useEffect(() => {
    if (!target) return
    fetch('/api/presence').then((r) => (r.ok ? r.json() : null)).then((b) => setExempt(Boolean(b?.exempt))).catch(() => {})
  }, [target])
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the screen title when the screen changes (keyboard and screen-reader users).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
    window.scrollTo({ top: 0 })
  }, [step, created])

  // The position lives in the GPS hook; the form only reads the final fix.
  const reading = gps.state.status === 'done' ? gps.state.fix : null
  const spot = pin ?? (target && reading ? target : null)
  // `fix` is the position every later step uses: the pin when there is one, else the phone's reading.
  const fix = reading ? { ...reading, ...(spot ?? {}) } : null
  const away = target && reading && !exempt ? metresToTarget(reading, target) : 0

  const list = useMemo(() => (streets.phase === 'ready' ? streets.streets : []), [streets])
  const noStreetNearby = streets.phase === 'ready' && list.length === 0
  const effectiveChoice = noStreetNearby ? NEW_STREET : choice
  const naming = effectiveChoice === NEW_STREET
  const chosenName = ownName.trim() || pickedName
  const usedNames = useMemo(() => list.map((s) => s.name).filter(Boolean), [list])
  const suggestions = useMemo(
    () => suggestNames({ used: usedNames, lang: nameLang, seed, page: namePage }),
    [usedNames, nameLang, seed, namePage]
  )
  const joined = list.find((s) => s.id === effectiveChoice) ?? null

  function startGps() {
    setErrors((e) => ({ ...e, location: '' }))
    setPin(null)
    gps.start()
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e))
  }

  async function loadStreets(point: GpsFix) {
    const key = `${point.lat},${point.lng}`
    setStreets({ phase: 'loading' })
    try {
      const res = await fetch(`/api/streets?near=${point.lng.toFixed(6)},${point.lat.toFixed(6)}`)
      if (!res.ok) throw new Error('streets')
      const body = (await res.json()) as { streets?: NearStreet[] }
      streetsFor.current = key
      setChoice(null)
      setStreets({ phase: 'ready', streets: Array.isArray(body.streets) ? body.streets : [] })
    } catch {
      setStreets({ phase: 'error', offline: typeof navigator !== 'undefined' && !navigator.onLine })
    }
  }

  function validate(which: Step): Errors {
    const e: Errors = {}
    if (which === 'where') {
      if (!fix) e.location = t.create.where.needFix
      else if (!inCameroon(fix.lat, fix.lng)) e.location = t.create.where.outside
      else if (fix.accuracyM > GPS_MAX_M) e.location = t.create.where.poor
      else if (away > 0) e.location = fmt(t.create.target.far, { m: away })
      else if (reading && metresBetween(reading, fix) > MAX_PIN_OFFSET_M) e.location = t.create.where.tooFar
    }
    if (which === 'what') {
      if (!CATEGORIES.includes(form.category)) e.category = t.create.what.categoryError
      if (form.name.trim().length < 2) e.name = t.create.what.nameError
    }
    if (which === 'street') {
      if (streets.phase !== 'ready' || !effectiveChoice) e.street = t.create.street.choose
      else if (naming && ownName.trim()) {
        if (validateStreetName(ownName).error || clashesWith(ownName, usedNames)) e.streetName = t.create.street.ownError
      } else if (naming && !pickedName) e.street = t.create.street.choose
    }
    if (which === 'details') {
      if (form.city.trim().length < 2) e.city = t.create.details.cityError
      if (!REGIONS.includes(form.region)) e.region = t.create.details.regionError
      if (form.quarter.length > 60 || form.landmark.length > 140) e.landmark = t.create.details.tooLong
    }
    if (which === 'consent') {
      if (!form.consent) e.consent = t.create.consent.agreeError
      if (!form.adult) e.adult = t.create.consent.adultError
    }
    return e
  }

  function enter(next: Step, from: Step) {
    if (next === 'street' && fix && (streets.phase !== 'ready' || streetsFor.current !== `${fix.lat},${fix.lng}`)) {
      loadStreets(fix)
    }
    // Quarter, city and region follow the chosen street (editable afterwards).
    if (from === 'street' && next === 'details') {
      const key = String(effectiveChoice)
      if (joined && prefilledFor.current !== key) {
        prefilledFor.current = key
        setForm((f) => ({
          ...f,
          quarter: joined.quarter || f.quarter,
          city: joined.city || f.city,
          region: regionForCity(joined.city) ?? f.region,
        }))
      }
    }
    setStep(next)
  }

  function goNext() {
    const found = validate(step)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    enter(STEPS[STEPS.indexOf(step) + 1], step)
  }

  // "Passer": the street stays unnamed; a neighbour can name it later.
  function skipName() {
    setPickedName('')
    setOwnName('')
    setErrors({})
    enter('details', 'street')
  }

  function goBack() {
    setErrors({})
    setSubmitError('')
    setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)])
  }

  function pickStreet(id: string) {
    setChoice(id)
    setErrors((e) => (e.street ? { ...e, street: '' } : e))
  }

  function changeNameLang(next: Lang) {
    setNameLang(next)
    setPickedName('')
    setOwnName('')
    setNamePage(0)
  }

  function streetPayload() {
    if (joined) return { streetId: joined.id }
    return { new: { ...(chosenName ? { name: chosenName } : {}), lang: chosenName ? nameLang : lang } }
  }

  async function submit() {
    const found = validate('consent')
    setErrors(found)
    setSubmitError('')
    if (Object.keys(found).length > 0 || !fix || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: fix.lat,
          lng: fix.lng,
          accuracyM: Math.round(fix.accuracyM),
          pinAdjusted: spot !== null,
          fix: reading ? { lat: reading.lat, lng: reading.lng } : undefined,
          name: form.name,
          category: form.category,
          city: form.city,
          region: form.region,
          quarter: form.quarter,
          landmark: form.landmark,
          visibility: form.visibility,
          street: streetPayload(),
          consent: form.consent,
          adultOrParentOk: form.adult,
        }),
      })
      if (res.status === 201) {
        const { manageKey, ...place } = (await res.json()) as PlaceView & { manageKey?: string }
        saveLocalPlace(place)
        setCreated({ place, manageKey: manageKey ?? '' })
      } else if (res.status === 400) {
        const body = (await res.json().catch(() => ({}))) as { fields?: string[] }
        const fields = Array.isArray(body.fields) ? body.fields : []
        const next: Errors = {}
        for (const field of fields) next[field === 'adultOrParentOk' ? 'adult' : field] = fieldMessage(t, field)
        setErrors(next)
        const target = fields.map((f) => FIELD_STEP[f]).filter(Boolean).sort((a, b) => STEPS.indexOf(a) - STEPS.indexOf(b))[0]
        if (target && target !== 'consent') setStep(target)
        setSubmitError(t.create.errors.invalid)
      } else if (res.status === 409) {
        await handleConflict(res)
      } else if (res.status === 429) {
        setSubmitError(t.create.errors.tooMany)
      } else {
        setSubmitError(t.create.errors.generic)
      }
    } catch {
      setSubmitError(t.create.errors.network)
    } finally {
      setSubmitting(false)
    }
  }

  // The street changed under the user (a neighbour took the name, or the street already exists): back to the street step.
  async function handleConflict(res: Response) {
    const body = (await res.json().catch(() => ({}))) as { reason?: string }
    const s = t.create.street
    if (body.reason === 'name_taken_nearby') {
      setPickedName('')
      setOwnName('')
      setNamePage((p) => p + 1)
      setNameNotice(s.taken)
      setStep('street')
      return
    }
    const message =
      body.reason === 'street_exists_nearby' ? s.exists
      : body.reason === 'too_far_from_street' ? s.tooFar
      : body.reason === 'past_street_end' ? s.pastEnd
      : ''
    if (!message) {
      setSubmitError(t.create.errors.generic)
      return
    }
    setErrors({ street: message })
    setChoice(null)
    setStep('street')
    if (fix) await loadStreets(fix)
  }

  function startAnother() {
    setCreated(null)
    setPin(null)
    gps.reset()
    setForm({ ...EMPTY, city: form.city, region: form.region })
    setErrors({})
    setSubmitError('')
    setStreets({ phase: 'idle' })
    setChoice(null)
    setPickedName('')
    setOwnName('')
    setNamePage(0)
    setNameNotice('')
    streetsFor.current = ''
    prefilledFor.current = ''
    setStep('where')
  }

  if (created) return <CreateDone place={created.place} manageKey={created.manageKey} t={t} headingRef={heading} onAnother={startAnother} />

  const stepNumber = STEPS.indexOf(step) + 1
  const titles: Record<Step, string> = {
    where: t.create.where.title,
    what: t.create.what.title,
    street: naming ? t.create.street.nameTitle : t.create.street.title,
    details: t.create.details.title,
    consent: t.create.consent.title,
  }
  const locating = gps.state.status === 'locating'
  const fixOk = Boolean(fix) && !errors.location && away === 0
  const streetBusy = step === 'street' && streets.phase !== 'ready'
  const showNext = step === 'where' ? fixOk && !locating : step === 'street' ? !streetBusy : true
  const platePlate = joined?.ideal ? String(joined.ideal.number) : null

  return (
    <div>
      {step !== 'where' && (
        <button type="button" onClick={goBack} disabled={submitting} className={`${linkButton} -ml-2 mb-1 gap-1 no-underline`}>
          <ChevronIcon className="h-5 w-5 rotate-180" />
          {t.common.back}
        </button>
      )}
      <StepHeader step={stepNumber} labels={t.create.steps} text={fmt(t.create.stepOf, { n: stepNumber, total: STEPS.length })} />
      <h1 ref={heading} tabIndex={-1} className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight outline-none">
        {titles[step]}
      </h1>

      <form
        noValidate
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 'consent') submit()
          else goNext()
        }}
      >
        {step === 'where' && (
          <WhereStep
            t={t}
            state={gps.state}
            fix={fix}
            reading={reading}
            origin={target && reading ? target : reading}
            moved={pin !== null}
            away={away}
            targeted={Boolean(target)}
            error={errors.location}
            onStart={startGps}
            onPin={setPin}
            onReset={() => setPin(null)}
          />
        )}

        {step === 'what' && (
          <>
            <fieldset aria-describedby={errors.category ? 'category-error' : undefined}>
              <legend className="mb-2 text-base font-bold text-night-900">{t.categories.label}</legend>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((value: string) => (
                  <label key={value} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={value}
                      checked={form.category === value}
                      onChange={() => set('category', value)}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-field bg-white px-1 py-2 text-center text-base font-bold text-night-900 peer-checked:border-clay peer-checked:bg-sun-50 peer-checked:shadow-[0_0_0_3px_#ffe2bf] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-sun-200 text-earth">
                        <CategoryIcon category={value} className="h-6 w-6" />
                      </span>
                      {(t.categories as Record<string, string>)[value]}
                    </span>
                  </label>
                ))}
              </div>
              {errors.category && <p id="category-error" className="mt-1 text-base font-bold text-danger">{errors.category}</p>}
            </fieldset>

            <FieldShell id="name" label={t.create.what.name} hint={t.create.what.nameHint} error={errors.name}>
              <input
                id="name"
                type="text"
                autoComplete="off"
                maxLength={80}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy('name', true, errors.name)}
                className={inputClass(Boolean(errors.name))}
              />
            </FieldShell>
          </>
        )}

        {step === 'street' && (
          <>
            {fix && !naming && (
              <MiniMap lat={fix.lat} lng={fix.lng} accuracyM={fix.accuracyM} label={t.create.where.title} note={t.create.where.entrance} />
            )}

            {streets.phase === 'loading' && (
              <div role="status" aria-live="polite" className="space-y-2">
                <p className="text-base font-semibold text-night-900">{t.create.street.loading}</p>
                {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-line" />)}
              </div>
            )}

            {streets.phase === 'error' && (
              <div className="space-y-3">
                <p role="alert" className="rounded-xl border-2 border-danger bg-white p-3 text-base font-bold text-danger">
                  {streets.offline ? t.create.street.offline : t.create.errors.generic}
                </p>
                <button type="button" onClick={() => fix && loadStreets(fix)} className={secondaryButton}>
                  {t.create.street.retry}
                </button>
              </div>
            )}

            {streets.phase === 'ready' && !naming && (
              <>
                <p className="text-base text-night-900">{t.create.street.intro}</p>
                <StreetPicker t={t} streets={list} selected={effectiveChoice} onSelect={pickStreet} />
              </>
            )}

            {streets.phase === 'ready' && naming && (
              <>
                {noStreetNearby && <p className="rounded-xl bg-white p-3 text-base font-semibold text-night-900">{t.create.street.noStreet}</p>}
                <StreetNamePrompt
                  t={t}
                  suggestions={suggestions}
                  picked={pickedName}
                  own={ownName}
                  ownError={errors.streetName ?? ''}
                  notice={nameNotice}
                  lang={nameLang}
                  onLang={changeNameLang}
                  onPick={(name) => {
                    setPickedName(name)
                    setOwnName('')
                    setNameNotice('')
                    setErrors((e) => (e.street || e.streetName ? { ...e, street: '', streetName: '' } : e))
                  }}
                  onOwn={(text) => {
                    setOwnName(text)
                    setNameNotice('')
                    setErrors((e) => (e.street || e.streetName ? { ...e, street: '', streetName: '' } : e))
                  }}
                  onMore={() => {
                    setNamePage((p) => p + 1)
                    setPickedName('')
                    setNameNotice('')
                  }}
                />
                {chosenName && (
                  <p className="rounded-2xl bg-night-900 p-3.5 text-base text-white">{fmt(t.create.street.numberNew, { name: chosenName })}</p>
                )}
                {!noStreetNearby && (
                  <button type="button" onClick={() => setChoice(null)} className={linkButton}>
                    {t.common.back}
                  </button>
                )}
              </>
            )}
            {errors.street && <p role="alert" className="text-base font-bold text-danger">{errors.street}</p>}
          </>
        )}

        {step === 'details' && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[inset_0_0_0_2px_#E7DED3]">
              {platePlate && <span className="plate-no">{platePlate}</span>}
              <p className="min-w-0 break-words text-[17px] font-extrabold">
                {joined ? streetLabel(t, joined.name) : chosenName ? streetLabel(t, chosenName) : t.create.street.unnamed}
                {(joined?.quarter || form.quarter) && <span className="font-semibold text-muted"> · {joined?.quarter || form.quarter}</span>}
              </p>
            </div>

            <FieldShell
              id="landmark"
              label={t.create.details.landmark}
              note={t.common.recommended}
              hint={t.create.details.landmarkHint}
              error={errors.landmark}
            >
              <textarea
                id="landmark"
                rows={3}
                maxLength={140}
                value={form.landmark}
                onChange={(e) => set('landmark', e.target.value)}
                aria-invalid={Boolean(errors.landmark)}
                aria-describedby={describedBy('landmark', true, errors.landmark)}
                className={inputClass(Boolean(errors.landmark))}
              />
              <p className="mt-1 text-right text-sm text-muted">{form.landmark.length}/140</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {t.create.details.landmarkIdeas.map((idea: string) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => set('landmark', (form.landmark ? `${form.landmark}, ${idea.toLowerCase()}` : idea).slice(0, 140))}
                    className="min-h-11 rounded-full bg-white px-3.5 text-base font-semibold text-night-900 shadow-[inset_0_0_0_2px_#857A70]"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </FieldShell>

            <FieldShell id="quarter" label={t.create.details.quarter} note={joined ? t.create.details.quarterHint : t.common.optional}>
              <input
                id="quarter"
                type="text"
                autoComplete="off"
                maxLength={60}
                value={form.quarter}
                onChange={(e) => set('quarter', e.target.value)}
                className={inputClass(false)}
              />
            </FieldShell>

            <FieldShell id="city" label={t.create.details.city} error={errors.city}>
              <input
                id="city"
                type="text"
                list="city-suggestions"
                autoComplete="off"
                maxLength={60}
                value={form.city}
                onChange={(e) => {
                  const region = regionForCity(e.target.value)
                  set('city', e.target.value)
                  if (region && !form.region) set('region', region)
                }}
                aria-invalid={Boolean(errors.city)}
                aria-describedby={describedBy('city', false, errors.city)}
                className={inputClass(Boolean(errors.city))}
              />
              <datalist id="city-suggestions">
                {CITIES.map((c) => <option key={c.name} value={c.name} />)}
              </datalist>
            </FieldShell>

            <FieldShell id="region" label={t.create.details.region} error={errors.region}>
              <select
                id="region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                aria-invalid={Boolean(errors.region)}
                aria-describedby={describedBy('region', false, errors.region)}
                className={inputClass(Boolean(errors.region))}
              >
                <option value="">{t.create.details.regionPlaceholder}</option>
                {REGIONS.map((r: string) => (
                  <option key={r} value={r}>{(t.regions as Record<string, string>)[r]}</option>
                ))}
              </select>
            </FieldShell>
          </>
        )}

        {step === 'consent' && (
          <>
            <fieldset>
              <legend className="mb-2 text-base font-bold text-night-900">{t.visibility.label}</legend>
              <div className="space-y-2">
                {VISIBILITY_ORDER.map((value) => (
                  <label key={value} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value={value}
                      checked={form.visibility === value}
                      onChange={() => set('visibility', value)}
                      className="peer sr-only"
                    />
                    <span className="block min-h-14 rounded-2xl border-2 border-field bg-white px-4 py-3 peer-checked:border-clay peer-checked:bg-sun-50 peer-checked:shadow-[0_0_0_3px_#ffe2bf] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay">
                      <span className="block text-[17px] font-extrabold text-night-900">{t.visibility[value]}</span>
                      <span className="block text-base text-muted">{t.visibility[`${value}Hint` as 'linkHint']}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="rounded-2xl bg-white p-4 text-base text-night-900 shadow-[inset_0_0_0_2px_#E7DED3]">
              <p>{t.create.consent.saved}</p>
              <p className="mt-2">{t.create.consent.control}</p>
            </div>

            <div>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1 text-base text-night-900">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => set('consent', e.target.checked)}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded border-field text-clay focus:ring-sun-200"
                />
                <span>{t.create.consent.agree}</span>
              </label>
              {errors.consent && <p id="consent-error" className="text-base font-bold text-danger">{errors.consent}</p>}
            </div>

            <div>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1 text-base text-night-900">
                <input
                  type="checkbox"
                  checked={form.adult}
                  onChange={(e) => set('adult', e.target.checked)}
                  aria-invalid={Boolean(errors.adult)}
                  aria-describedby={errors.adult ? 'adult-error' : undefined}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded border-field text-clay focus:ring-sun-200"
                />
                <span>{t.create.consent.adult}</span>
              </label>
              {errors.adult && <p id="adult-error" className="text-base font-bold text-danger">{errors.adult}</p>}
            </div>

            {submitError && (
              <p role="alert" className="rounded-xl border-2 border-danger bg-white p-3 text-base font-bold text-danger">
                {submitError}
              </p>
            )}
          </>
        )}

        {/* Sticky action bar: one primary button (two while naming a street). */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-sand/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="flex gap-2">
            {step === 'street' && naming && streets.phase === 'ready' && (
              <button type="button" onClick={skipName} className={`${secondaryButton} !w-auto shrink-0`}>
                {t.create.street.skip}
              </button>
            )}
            {step === 'consent' ? (
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting ? t.create.consent.submitting : t.create.consent.submit}
              </button>
            ) : (
              showNext && <button type="submit" className={primaryButton}>{t.common.next}</button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

function WhereStep(props: {
  t: Dict
  state: ReturnType<typeof useGps>['state']
  fix: GpsFix | null
  reading: GpsFix | null
  origin: Spot | null
  moved: boolean
  away: number
  targeted: boolean
  error?: string
  onStart: () => void
  onPin: (spot: Spot) => void
  onReset: () => void
}) {
  const { t, state, fix, reading, origin, moved, away, targeted, error, onStart, onPin, onReset } = props
  const w = t.create.where

  if (state.status === 'locating') {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl bg-white p-4 text-base text-night-900 shadow-[inset_0_0_0_2px_#E7DED3]">
        <p className="font-bold">{w.locating}</p>
        {state.best && <p className="mt-1 text-muted">{fmt(w.precision, { m: Math.round(state.best.accuracyM) })}</p>}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <p role="alert" className="rounded-xl border-2 border-danger bg-white p-3 text-base font-bold text-danger">
          {w[state.error]}
        </p>
        <button type="button" onClick={onStart} className={primaryButton}>
          <CrosshairIcon className="h-6 w-6" />
          {w.again}
        </button>
      </>
    )
  }

  if (fix && reading && away > 0) {
    return (
      <>
        <p role="alert" className="rounded-xl border-2 border-danger bg-white p-3 text-base font-bold text-danger">
          {fmt(t.create.target.far, { m: away })}
        </p>
        <button type="button" onClick={onStart} className={primaryButton}>
          <CrosshairIcon className="h-6 w-6" />
          {t.create.target.retry}
        </button>
      </>
    )
  }

  if (fix && reading && origin) {
    const quality = gpsQuality(fix.accuracyM)
    const good = quality === 'good'
    return (
      <>
        <PinMap
          origin={origin}
          pin={fix}
          reading={reading}
          moved={moved}
          onPin={onPin}
          onReset={onReset}
          labels={{ map: w.title, note: w.pinNote, reset: w.pinReset, satellite: w.satellite, plan: w.plan, help: w.pinHelp }}
        />
        <div
          role="status"
          className={`rounded-2xl border-2 bg-white p-4 text-base text-night-900 ${good ? 'border-leaf' : quality === 'fair' ? 'border-sun' : 'border-danger'}`}
        >
          <p className="flex items-center gap-2 font-bold">
            {good && <CheckIcon className="h-6 w-6 text-leaf" />}
            {w[quality]}
          </p>
          <p className="mt-1 text-muted">{fmt(w.precision, { m: Math.round(fix.accuracyM) })}</p>
        </div>
        {error && <p className="text-base font-bold text-danger">{error}</p>}
        <a href={mapsViewUrl(fix)} target="_blank" rel="noopener noreferrer" className={linkButton}>
          {t.common.seeOnMaps}
        </a>
        <button type="button" onClick={onStart} className={secondaryButton}>
          <CrosshairIcon className="h-6 w-6" />
          {w.again}
        </button>
      </>
    )
  }

  return (
    <>
      <p className="text-base text-night-900">{targeted ? t.create.target.intro : w.intro}</p>
      {error && <p className="text-base font-bold text-danger">{error}</p>}
      <button type="button" onClick={onStart} className={primaryButton}>
        <CrosshairIcon className="h-6 w-6" />
        {w.button}
      </button>
    </>
  )
}
