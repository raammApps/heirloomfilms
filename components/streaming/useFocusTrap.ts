'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Trap Tab inside a dialog, close it on Esc, lock body scroll without layout shift, and
 * restore focus to whatever opened it (doc 08 `<TitleModal>` behaviours 1–4).
 *
 * Shared by the title modal and the lightbox so the two cannot drift apart.
 */
export function useFocusTrap(
  container: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: { autoFocus?: boolean },
): void {
  useEffect(() => {
    const node = container.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Compensating for the scrollbar keeps the page behind from shifting a few pixels when it
    // disappears — a small thing that reads as jank on desktop.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const { overflow, paddingRight } = document.body.style
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    if (options?.autoFocus !== false) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? node).focus({ preventScroll: true })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusable.length === 0) return

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      previouslyFocused?.focus?.({ preventScroll: true })
    }
    // `onClose` is stable at every call site; re-running this effect would steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container])
}
