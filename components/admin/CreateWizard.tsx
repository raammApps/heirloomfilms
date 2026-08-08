'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { suggestSlug } from '@/lib/format'
import { TEMPLATES } from '@/lib/admin/templates'
import { FLIX_SUFFIX } from '@/lib/schema'
import { UploadManager } from './UploadManager'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'The wedding',
  2: 'The shape',
  3: 'Upload',
  4: 'Titles',
}

const DRAFT_KEY = 'mehfil.wizard.draft'

/**
 * The four-step create wizard (doc 02 §3).
 *
 * Two properties matter more than the form itself:
 *  - **nothing is lost on refresh** — an operator does this between phone calls, so step 1–2
 *    input is mirrored to localStorage until the catalogue exists;
 *  - **upload starts at step 3 and keeps running** through step 4 and beyond. Making an
 *    operator wait for a 6GB upload before they can type a title wastes the only thing they
 *    have less of than money.
 */
export function CreateWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [catalogueId, setCatalogueId] = useState<string | null>(null)

  const [coupleName, setCoupleName] = useState('')
  const [appName, setAppName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [city, setCity] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugState, setSlugState] = useState<{ available: boolean; reason?: string } | null>(null)
  const [template, setTemplate] = useState(TEMPLATES[0]!.id)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Restore an interrupted wizard.
  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as Record<string, string>
      setCoupleName(draft.coupleName ?? '')
      setAppName(draft.appName ?? '')
      setWeddingDate(draft.weddingDate ?? '')
      setCity(draft.city ?? '')
      setSlug(draft.slug ?? '')
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    if (catalogueId) return
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ coupleName, appName, weddingDate, city, slug }),
    )
  }, [coupleName, appName, weddingDate, city, slug, catalogueId])

  // Slug is suggested from the couple's names until the operator edits it themselves.
  useEffect(() => {
    if (slugTouched || !coupleName) return
    setSlug(suggestSlug({ en: coupleName }))
  }, [coupleName, slugTouched])

  // Live availability check, debounced.
  useEffect(() => {
    if (slug.length < 3) {
      setSlugState(null)
      return
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/slug-check?slug=${encodeURIComponent(slug)}`)
      if (response.ok) setSlugState((await response.json()) as { available: boolean; reason?: string })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [slug])

  const appNameProblem = FLIX_SUFFIX.test(appName)

  const create = async () => {
    setBusy(true)
    setErrors({})

    const response = await fetch('/api/admin/catalogues', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        coupleName: { en: coupleName },
        appName: { en: appName || `${coupleName} Originals` },
        weddingDate,
        slug,
        city: city ? { en: city } : undefined,
        template,
      }),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string; fields?: Record<string, string> }
      } | null
      setErrors(body?.error?.fields ?? { _: body?.error?.message ?? 'Could not create the catalogue' })
      setBusy(false)
      return
    }

    const body = (await response.json()) as { catalogue: { id: string } }
    window.localStorage.removeItem(DRAFT_KEY)
    setCatalogueId(body.catalogue.id)
    setStep(3)
    setBusy(false)
  }

  return (
    <div className="max-w-[640px]">
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Steps">
        {([1, 2, 3, 4] as Step[]).map((n) => (
          <li
            key={n}
            aria-current={step === n ? 'step' : undefined}
            className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] ${
              step === n
                ? 'bg-[var(--color-l-text-hi)] text-white'
                : 'bg-[var(--color-l-surface-2)] text-[var(--color-l-text-mid)]'
            }`}
          >
            {n}. {STEP_LABELS[n]}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section>
          <Text label="Couple" value={coupleName} onChange={setCoupleName} placeholder="Aanya & Vikram" />
          <Text
            label="Wedding date"
            value={weddingDate}
            onChange={setWeddingDate}
            type="date"
            error={errors.weddingDate}
          />
          <Text label="City" value={city} onChange={setCity} placeholder="Jaipur" />

          <Text
            label="Web address"
            value={slug}
            onChange={(next) => {
              setSlugTouched(true)
              setSlug(next)
            }}
            hint={slugState ? (slugState.available ? 'Available' : slugState.reason) : undefined}
            error={errors.slug ?? (slugState && !slugState.available ? slugState.reason : undefined)}
          />

          <Text
            label="App name"
            value={appName}
            onChange={setAppName}
            placeholder={coupleName ? `${coupleName} Originals` : 'Aanya & Vikram Originals'}
            hint="What guests see as the wordmark on the profile screen."
            error={
              appNameProblem
                ? 'Try "…Stream", "…Originals" or "The … Files" instead — the -flix suffix is out.'
                : errors['appName.en']
            }
          />

          <Nav
            onNext={() => setStep(2)}
            nextDisabled={
              !coupleName || !weddingDate || !slug || appNameProblem || slugState?.available === false
            }
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <p className="mb-3 text-[14px] text-[var(--color-l-text-mid)]">
            Pick a starting shape. You can rearrange everything afterwards.
          </p>
          <ul className="mb-6 space-y-2">
            {TEMPLATES.map((option) => (
              <li key={option.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-3">
                  <input
                    type="radio"
                    name="template"
                    checked={template === option.id}
                    onChange={() => setTemplate(option.id)}
                    className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span>
                    <span className="block text-[15px] font-semibold">{option.label}</span>
                    <span className="block text-[13px] text-[var(--color-l-text-mid)]">
                      {option.description}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {errors._ ? (
            <p role="alert" className="mb-3 text-[14px] text-[var(--color-error)]">
              {errors._}
            </p>
          ) : null}

          <Nav
            onBack={() => setStep(1)}
            onNext={() => void create()}
            nextLabel={busy ? 'Creating…' : 'Create and start uploading'}
            nextDisabled={busy}
          />
        </section>
      ) : null}

      {step === 3 && catalogueId ? (
        <section>
          <p className="mb-3 text-[14px] text-[var(--color-l-text-mid)]">
            Drop the films in. They keep uploading while you title them on the next step, and
            while you work anywhere else in the admin.
          </p>
          <UploadManager catalogueId={catalogueId} />
          <Nav onNext={() => setStep(4)} nextLabel="Title the films" />
        </section>
      ) : null}

      {step === 4 && catalogueId ? (
        <section>
          <p className="mb-4 text-[14px] text-[var(--color-l-text-mid)]">
            Names have been guessed from the filenames. Correct them, set a category, and publish
            the ones that are ready.
          </p>
          <Nav
            onBack={() => setStep(3)}
            onNext={() => router.push(`/admin/c/${catalogueId}/titles`)}
            nextLabel="Open the film list"
          />
        </section>
      ) : null}
    </div>
  )
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  hint?: string
  error?: string
  type?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] bg-white px-3 py-2.5 text-[15px]"
      />
      {error ? (
        <p role="alert" className="mt-1 text-[13px] text-[var(--color-error)]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[13px] text-[var(--color-l-text-mid)]">{hint}</p>
      ) : null}
    </div>
  )
}

function Nav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
}: {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="h-11 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-5 text-[14px] font-semibold"
        >
          Back
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="h-11 rounded-[var(--radius-pill)] bg-accent px-5 text-[14px] font-semibold text-accent-ink disabled:opacity-50"
      >
        {nextLabel}
      </button>
    </div>
  )
}
