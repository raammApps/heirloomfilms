export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * "Did that save?" — answered once, for every surface that autosaves.
 *
 * N-30. The console had four surfaces that save and four different answers to that question: the
 * customizer and the theme picker said so, settings had a status line, the wizard had an explicit
 * button — and the film list, which writes on blur, said nothing at all. Worse than nothing: it
 * never checked the response, so a refused save and a successful one looked identical, and an
 * operator could rename a film, see no reaction, navigate away and lose it silently.
 *
 * A shared component rather than a second copy of the customizer's markup, on the same reasoning
 * the guest tree gives for sharing components with the preview: two implementations of one idea
 * drift, and the one that drifts is always the one nobody is looking at.
 *
 * `role="status"` carries an implicit polite live region, so a screen reader hears the outcome
 * without the focus moving — which matters most here, because the change is announced *after*
 * blur has already sent focus somewhere else.
 */
export function SaveState({
  status,
  savedLabel = 'Saved',
  className = '',
}: {
  status: SaveStatus
  /** The customizer saves to a draft rather than to the live page, and says so. */
  savedLabel?: string
  className?: string
}) {
  return (
    <p role="status" className={`text-[13px] text-[var(--color-l-text-mid)] ${className}`}>
      {status === 'saving'
        ? 'Saving…'
        : status === 'saved'
          ? savedLabel
          : status === 'error'
            ? 'Not saved — your change is still here, and will retry on the next edit'
            : ''}
    </p>
  )
}
