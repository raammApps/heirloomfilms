import Link from 'next/link'

/**
 * Persistent left rail plus, inside a catalogue, a horizontal sub-nav (doc 02 §4).
 * Server component — nothing here has state.
 */
export function AdminChrome({
  children,
  operatorName,
  catalogue,
}: {
  children: React.ReactNode
  operatorName: string
  catalogue?: { id: string; name: string; slug: string; status: string }
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1440px]">
      <nav
        aria-label="Sections"
        className="hidden w-[220px] shrink-0 border-e border-[var(--color-l-line)] p-5 md:block"
      >
        <p className="mb-8 text-[18px] font-bold">Mehfil</p>
        <ul className="space-y-1 text-[14px]">
          <RailLink href="/admin">Catalogues</RailLink>
          <RailLink href="/admin/new">New catalogue</RailLink>
        </ul>
        <p className="mt-10 text-[12px] text-[var(--color-l-text-mid)]">Signed in as {operatorName}</p>
      </nav>

      <div className="min-w-0 flex-1">
        {catalogue ? (
          <header className="border-b border-[var(--color-l-line)] px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-[20px] font-bold">{catalogue.name}</h1>
              <StatusPill status={catalogue.status} />
              <code className="text-[12px] text-[var(--color-l-text-mid)]">{catalogue.slug}</code>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1 text-[14px]">
              <SubNavLink href={`/admin/c/${catalogue.id}`}>Overview</SubNavLink>
              <SubNavLink href={`/admin/c/${catalogue.id}/titles`}>Films</SubNavLink>
              <SubNavLink href={`/admin/c/${catalogue.id}/customizer`}>Customizer</SubNavLink>
              <SubNavLink href={`/admin/c/${catalogue.id}/settings`}>Settings</SubNavLink>
            </ul>
          </header>
        ) : null}

        <main className="p-5">{children}</main>
      </div>
    </div>
  )
}

function RailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-[var(--radius-input)] px-3 py-2 hover:bg-[var(--color-l-surface-2)]"
      >
        {children}
      </Link>
    </li>
  )
}

function SubNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-[var(--radius-pill)] px-3 py-1.5 hover:bg-[var(--color-l-surface-2)]"
      >
        {children}
      </Link>
    </li>
  )
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'bg-[color-mix(in_srgb,var(--color-ok)_16%,white)] text-[#1c5f2a]'
      : 'bg-[var(--color-l-surface-2)] text-[var(--color-l-text-mid)]'
  return (
    <span className={`type-label rounded px-2 py-1 ${tone}`}>
      {status === 'published' ? 'Live' : 'Draft'}
    </span>
  )
}
