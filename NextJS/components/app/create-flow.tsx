'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/provider'
import { fmt } from '@/i18n/lang'
import type { Dict } from '@/i18n/dictionary'
import { CATEGORIES, REGIONS } from '@/utils/placeValidation.js'
import { CITIES, regionForCity } from '@/utils/cities'
import { GPS_MAX_M, gpsQuality, inCameroon } from '@/utils/gps'
import { mapsViewUrl } from '@/utils/share'
import { saveLocalPlace } from '@/utils/localPlaces'
import type { PlaceView } from '@/types/place'
import PlaceCard from './place-card'
import PlaceActions from './place-actions'
import { inputClass, linkButton, primaryButton, secondaryButton } from './ui-classes'
import { CheckIcon, CrosshairIcon } from './icons'
import { useGps, type GpsFix } from './use-gps'

type Step = 'where' | 'what' | 'details' | 'consent'
type Visibility = 'private' | 'link' | 'public'
type Errors = Record<string, string>

type Form = {
  category: string
  name: string
  city: string
  region: string
  quarter: string
  houseNumber: string
  landmark: string
  visibility: Visibility
  consent: boolean
  adult: boolean
}

const EMPTY: Form = {
  category: '', name: '', city: '', region: '', quarter: '', houseNumber: '', landmark: '',
  visibility: 'link', consent: false, adult: false,
}

const STEPS: Step[] = ['where', 'what', 'details', 'consent']
const VISIBILITY_ORDER: Visibility[] = ['link', 'public', 'private']
const CATEGORY_EMOJI: Record<string, string> = {
  home: '🏠', shop: '🛒', salon: '✂️', restaurant: '🍽️', office: '🏢', other: '📍',
}
// Server field name -> the step that owns it.
const FIELD_STEP: Record<string, Step> = {
  location: 'where', name: 'what', category: 'what', city: 'details', region: 'details', landmark: 'details',
  quarter: 'details', officialNumber: 'details', houseNumber: 'details', visibility: 'consent', consent: 'consent', adultOrParentOk: 'consent',
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
      <label htmlFor={id} className="mb-1 block text-base font-semibold text-gray-900">
        {label}
        {note && <span className="ml-1 font-normal text-gray-700">({note})</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="mb-2 text-base text-gray-700">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-base font-medium text-red-700">{error}</p>}
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
    case 'city': return t.create.details.cityError
    case 'region': return t.create.details.regionError
    case 'landmark':
    case 'quarter':
    case 'officialNumber': return t.create.details.tooLong
    case 'consent': return t.create.consent.agreeError
    case 'adultOrParentOk': return t.create.consent.adultError
    default: return t.create.errors.invalid
  }
}

export default function CreateFlow() {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('where')
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [created, setCreated] = useState<PlaceView | null>(null)
  const gps = useGps()
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
  const fix = gps.state.status === 'done' ? gps.state.fix : null

  function startGps() {
    setErrors((e) => ({ ...e, location: '' }))
    gps.start()
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e))
  }

  function validate(which: Step): Errors {
    const e: Errors = {}
    if (which === 'where') {
      if (!fix) e.location = t.create.where.needFix
      else if (!inCameroon(fix.lat, fix.lng)) e.location = t.create.where.outside
      else if (fix.accuracyM > GPS_MAX_M) e.location = t.create.where.poor
    }
    if (which === 'what') {
      if (!CATEGORIES.includes(form.category)) e.category = t.create.what.categoryError
      if (form.name.trim().length < 2) e.name = t.create.what.nameError
    }
    if (which === 'details') {
      if (form.city.trim().length < 2) e.city = t.create.details.cityError
      if (!REGIONS.includes(form.region)) e.region = t.create.details.regionError
      if (form.quarter.length > 60 || form.houseNumber.length > 20 || form.landmark.length > 140) {
        e.landmark = t.create.details.tooLong
      }
    }
    if (which === 'consent') {
      if (!form.consent) e.consent = t.create.consent.agreeError
      if (!form.adult) e.adult = t.create.consent.adultError
    }
    return e
  }

  function goNext() {
    const found = validate(step)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setStep(STEPS[STEPS.indexOf(step) + 1])
  }

  function goBack() {
    setErrors({})
    setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)])
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
          name: form.name,
          category: form.category,
          city: form.city,
          region: form.region,
          quarter: form.quarter,
          officialNumber: form.houseNumber,
          landmark: form.landmark,
          visibility: form.visibility,
          consent: form.consent,
          adultOrParentOk: form.adult,
        }),
      })
      if (res.status === 201) {
        const place = (await res.json()) as PlaceView
        saveLocalPlace(place)
        setCreated(place)
      } else if (res.status === 400) {
        const body = (await res.json().catch(() => ({}))) as { fields?: string[] }
        const fields = Array.isArray(body.fields) ? body.fields : []
        const next: Errors = {}
        for (const field of fields) next[field === 'adultOrParentOk' ? 'adult' : field] = fieldMessage(t, field)
        setErrors(next)
        const target = fields.map((f) => FIELD_STEP[f]).filter(Boolean).sort((a, b) => STEPS.indexOf(a) - STEPS.indexOf(b))[0]
        if (target && target !== 'consent') setStep(target)
        setSubmitError(t.create.errors.invalid)
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

  function startAnother() {
    setCreated(null)
    gps.reset()
    setForm({ ...EMPTY, city: form.city, region: form.region })
    setErrors({})
    setSubmitError('')
    setStep('where')
  }

  if (created) return <Done place={created} t={t} headingRef={heading} onAnother={startAnother} />

  const stepNumber = STEPS.indexOf(step) + 1
  const titles: Record<Step, string> = {
    where: t.create.where.title,
    what: t.create.what.title,
    details: t.create.details.title,
    consent: t.create.consent.title,
  }
  const locating = gps.state.status === 'locating'
  const fixOk = Boolean(fix) && !errors.location

  return (
    <div>
      <p className="text-base font-medium text-gray-700">{fmt(t.create.stepOf, { n: stepNumber, total: STEPS.length })}</p>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i < stepNumber ? 'bg-green-700' : 'bg-gray-300'}`} />
        ))}
      </div>
      <h1 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-bold leading-snug outline-none">
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
            error={errors.location}
            onStart={startGps}
          />
        )}

        {step === 'what' && (
          <>
            <fieldset aria-describedby={errors.category ? 'category-error' : undefined}>
              <legend className="mb-2 text-base font-semibold text-gray-900">{t.categories.label}</legend>
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
                    <span className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-gray-300 bg-white px-1 py-2 text-center text-base font-medium text-gray-900 peer-checked:border-green-700 peer-checked:bg-green-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-700">
                      <span className="text-2xl" aria-hidden="true">{CATEGORY_EMOJI[value]}</span>
                      {(t.categories as Record<string, string>)[value]}
                    </span>
                  </label>
                ))}
              </div>
              {errors.category && <p id="category-error" className="mt-1 text-base font-medium text-red-700">{errors.category}</p>}
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

        {step === 'details' && (
          <>
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

            <FieldShell id="quarter" label={t.create.details.quarter} note={t.common.optional}>
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

            <FieldShell id="houseNumber" label={t.create.details.houseNumber} note={t.common.optional}>
              <input
                id="houseNumber"
                type="text"
                inputMode="text"
                autoComplete="off"
                maxLength={20}
                value={form.houseNumber}
                onChange={(e) => set('houseNumber', e.target.value)}
                className={inputClass(false)}
              />
            </FieldShell>

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
            </FieldShell>
          </>
        )}

        {step === 'consent' && (
          <>
            <fieldset>
              <legend className="mb-2 text-base font-semibold text-gray-900">{t.visibility.label}</legend>
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
                    <span className="block min-h-12 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 peer-checked:border-green-700 peer-checked:bg-green-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-700">
                      <span className="block text-base font-semibold text-gray-900">{t.visibility[value]}</span>
                      <span className="block text-base text-gray-700">{t.visibility[`${value}Hint` as 'linkHint']}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="rounded-xl bg-gray-100 p-4 text-base text-gray-900">
              <p>{t.create.consent.saved}</p>
              <p className="mt-2">{t.create.consent.control}</p>
            </div>

            <div>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1 text-base text-gray-900">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => set('consent', e.target.checked)}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded border-gray-500 text-green-700 focus:ring-green-700"
                />
                <span>{t.create.consent.agree}</span>
              </label>
              {errors.consent && <p id="consent-error" className="text-base font-medium text-red-700">{errors.consent}</p>}
            </div>

            <div>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 py-1 text-base text-gray-900">
                <input
                  type="checkbox"
                  checked={form.adult}
                  onChange={(e) => set('adult', e.target.checked)}
                  aria-invalid={Boolean(errors.adult)}
                  aria-describedby={errors.adult ? 'adult-error' : undefined}
                  className="mt-0.5 h-6 w-6 shrink-0 rounded border-gray-500 text-green-700 focus:ring-green-700"
                />
                <span>{t.create.consent.adult}</span>
              </label>
              {errors.adult && <p id="adult-error" className="text-base font-medium text-red-700">{errors.adult}</p>}
            </div>

            {submitError && (
              <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-base font-medium text-red-700">
                {submitError}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {step === 'consent' ? (
            <button type="submit" disabled={submitting} className={primaryButton}>
              {submitting ? t.create.consent.submitting : t.create.consent.submit}
            </button>
          ) : (
            (step !== 'where' || (fixOk && !locating)) && (
              <button type="submit" className={primaryButton}>{t.common.next}</button>
            )
          )}
          {step !== 'where' && (
            <button type="button" onClick={goBack} disabled={submitting} className={linkButton}>
              {t.common.back}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function WhereStep(props: {
  t: Dict
  state: ReturnType<typeof useGps>['state']
  fix: GpsFix | null
  error?: string
  onStart: () => void
}) {
  const { t, state, fix, error, onStart } = props
  const w = t.create.where

  if (state.status === 'locating') {
    return (
      <div role="status" aria-live="polite" className="rounded-xl bg-gray-100 p-4 text-base text-gray-900">
        <p className="font-semibold">{w.locating}</p>
        {state.best && <p className="mt-1">{fmt(w.precision, { m: Math.round(state.best.accuracyM) })}</p>}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-base font-medium text-red-700">
          {w[state.error]}
        </p>
        <button type="button" onClick={onStart} className={primaryButton}>
          <CrosshairIcon className="h-6 w-6" />
          {w.again}
        </button>
      </>
    )
  }

  if (fix) {
    const quality = gpsQuality(fix.accuracyM)
    const good = quality === 'good'
    return (
      <>
        <div
          role="status"
          className={`rounded-xl border-2 p-4 text-base ${good ? 'border-green-700 bg-green-50 text-gray-900' : 'border-amber-700 bg-amber-50 text-gray-900'}`}
        >
          <p className="flex items-center gap-2 font-semibold">
            {good && <CheckIcon className="h-6 w-6 text-green-700" />}
            {w[quality]}
          </p>
          <p className="mt-1">{fmt(w.precision, { m: Math.round(fix.accuracyM) })}</p>
        </div>
        {error && <p className="text-base font-medium text-red-700">{error}</p>}
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
      <p className="text-base text-gray-900">{w.intro}</p>
      {error && <p className="text-base font-medium text-red-700">{error}</p>}
      <button type="button" onClick={onStart} className={primaryButton}>
        <CrosshairIcon className="h-6 w-6" />
        {w.button}
      </button>
    </>
  )
}

function Done(props: {
  place: PlaceView
  t: Dict
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnother: () => void
}) {
  const { place, t, headingRef, onAnother } = props

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-snug outline-none">
        {t.create.done.title}
      </h1>
      <div className="mt-5">
        <PlaceCard place={place} t={t} />
      </div>
      <p className="mt-4 text-base text-gray-900">{t.create.done.next}</p>
      <p className="mt-1 text-base text-gray-700">
        {t.visibility.short[place.visibility]}. {t.create.done.savedOnDevice}
      </p>

      <div className="mt-5">
        <PlaceActions place={place} t={t} lead="share" />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4">
        <Link href="/mine" className={linkButton}>{t.create.done.mine}</Link>
        <button type="button" onClick={onAnother} className={linkButton}>{t.create.done.another}</button>
      </div>
    </div>
  )
}
