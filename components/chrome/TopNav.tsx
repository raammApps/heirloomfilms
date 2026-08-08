'use client'

import { useEffect, useState } from 'react'
import { useCatalogue } from '@/components/streaming/CatalogueProvider'
import { LOCALE_LABELS, type Translator } from '@/lib/i18n'
import { LOCALES, type Locale } from '@/lib/schema'

type Props = {
  appName: string
  logoUrl: string | null
  locale: Locale
  t: Translator
}

/**
 * Sticky, transparent over the billboard, solid on scroll (doc 02 §4).
 * No search, no hamburger — neither exists in this product.
 */
export function TopNav({ appName, logoUrl, locale, t }: Props) {
  const { setProfileId, preview } = useCatalogue()
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 h-[var(--nav-h,64px)] transition-colors duration-300 ${
        solid ? 'bg-surface-0/95 backdrop-blur-md' : 'bg-transparent'
      }`}
      style={{ ['--nav-h' as string]: '64px' }}
    >
      <div className="gutter-x flex h-full items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2 no-underline">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant logo, arbitrary host
            <img src={logoUrl} alt={appName} className="h-7 w-auto max-w-[160px] object-contain" />
          ) : (
            <span
              className="type-title text-accent"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.18em' }}
            >
              {appName.toUpperCase()}
            </span>
          )}
        </a>

        <div className="flex items-center gap-1">
          <LanguageToggle locale={locale} t={t} />

          {!preview ? (
            <button
              type="button"
              onClick={() => setProfileId(null)}
              className="type-label h-11 rounded-[var(--radius-pill)] px-3 text-text-lo hover:text-text-hi"
            >
              {t('nav.switchProfile')}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/**
 * The locale lives in a cookie rather than the URL: a guest arrives from WhatsApp on a link
 * the couple shared, and a `/hi` prefix in that link is one more thing to get wrong.
 */
function LanguageToggle({ locale, t }: { locale: Locale; t: Translator }) {
  const switchTo = (next: Locale) => {
    document.cookie = `mehfil_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    window.location.reload()
  }

  return (
    <div role="group" aria-label={t('nav.language')} className="flex items-center">
      {LOCALES.map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => switchTo(candidate)}
          aria-pressed={candidate === locale}
          className={`type-label h-11 min-w-11 rounded-[var(--radius-pill)] px-2 ${
            candidate === locale ? 'text-accent' : 'text-text-lo hover:text-text-hi'
          }`}
        >
          {LOCALE_LABELS[candidate]}
        </button>
      ))}
    </div>
  )
}
