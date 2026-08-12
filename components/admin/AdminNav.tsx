'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The navigation links, split out because knowing which one you are on needs the pathname, and
 * that is only available in the browser.
 *
 * `AdminChrome` stays a server component around these — the operator's name, the org and the
 * catalogue header are all data the server already holds, and shipping them to the client to
 * re-render would be paying for nothing.
 */

/** Matches the section, not the exact page: `/admin/c/x/titles` is still inside Films. */
function isCurrent(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function RailLink({
  href,
  icon,
  exact = false,
  children,
}: {
  href: string
  icon: React.ReactNode
  exact?: boolean
  children: React.ReactNode
}) {
  const current = isCurrent(usePathname() ?? '', href, exact)
  return (
    <li>
      <Link
        href={href}
        aria-current={current ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-[var(--radius-input)] px-3 py-2 text-[14px] transition-colors ${
          current
            ? 'bg-[var(--color-l-text-hi)] font-semibold text-white'
            : 'text-[var(--color-l-text-mid)] hover:bg-[var(--color-l-surface-2)] hover:text-[var(--color-l-text-hi)]'
        }`}
      >
        <span aria-hidden className="shrink-0 opacity-80">
          {icon}
        </span>
        {children}
      </Link>
    </li>
  )
}

/**
 * A catalogue tab. Underlined rather than filled: these sit under a heading that already carries
 * the catalogue's identity, and a second row of solid pills competes with the page's own primary
 * action.
 */
export function TabLink({
  href,
  exact = false,
  children,
}: {
  href: string
  exact?: boolean
  children: React.ReactNode
}) {
  const current = isCurrent(usePathname() ?? '', href, exact)
  return (
    <li>
      <Link
        href={href}
        aria-current={current ? 'page' : undefined}
        className={`-mb-px block border-b-2 px-3 py-2.5 text-[14px] transition-colors ${
          current
            ? 'border-[var(--color-accent)] font-semibold text-[var(--color-l-text-hi)]'
            : 'border-transparent text-[var(--color-l-text-mid)] hover:border-[var(--color-l-line)] hover:text-[var(--color-l-text-hi)]'
        }`}
      >
        {children}
      </Link>
    </li>
  )
}
