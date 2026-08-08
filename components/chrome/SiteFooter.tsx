import type { Translator } from '@/lib/i18n'

type Props = { presentedBy: string | null; t: Translator }

/** Presented by <planner> · privacy · renew (doc 02 §2). Server component; no interactivity. */
export function SiteFooter({ presentedBy, t }: Props) {
  return (
    <footer className="gutter-x mt-16 border-t border-surface-3 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {presentedBy ? (
          <p className="type-meta">{t('footer.presentedBy', { name: presentedBy })}</p>
        ) : (
          <span />
        )}
        <p className="type-meta">
          <a href="/privacy" className="underline-offset-4 hover:underline">
            {t('footer.privacy')}
          </a>
        </p>
      </div>
    </footer>
  )
}
