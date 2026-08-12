import Link from 'next/link'
import { RailLink, TabLink } from './AdminNav'
import { SignOutButton } from './SignOutButton'
import { IconGrid, IconPlus } from './icons'

/**
 * Persistent left rail plus, inside a catalogue, a horizontal sub-nav (doc 02 §4).
 *
 * Server component, deliberately: the operator, the org and the catalogue are all data the
 * server already has. Only the two pieces that need to know which page you are on — the rail
 * links and the tabs — are client components, and only sign-out has state.
 *
 * The rail used to be `hidden md:block` with nothing behind it, so on a phone the console had no
 * navigation at all: an operator who opened a catalogue could reach the rest of the admin only
 * with the browser's back button. The bar below restores it under `md`.
 */
export function AdminChrome({
  children,
  operatorName,
  operatorEmail,
  orgName,
  catalogue,
}: {
  children: React.ReactNode
  operatorName: string
  operatorEmail?: string
  /** Whose console this is. A partner runs several weddings; the couple runs one. */
  orgName?: string
  catalogue?: { id: string; name: string; slug: string; status: string }
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1440px]">
      <nav
        aria-label="Sections"
        className="sticky top-0 hidden h-svh w-[228px] shrink-0 flex-col border-e border-[var(--color-l-line)] bg-[var(--color-l-surface-1)] px-4 py-5 md:flex"
      >
        <Link href="/admin" className="mb-7 block px-1">
          <span className="block text-[19px] font-bold tracking-[-0.01em]">Mehfil</span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-l-text-mid)]">
            {orgName ?? 'Operator console'}
          </span>
        </Link>

        <ul className="space-y-1">
          <RailLink href="/admin" icon={<IconGrid />} exact>
            Catalogues
          </RailLink>
          <RailLink href="/admin/new" icon={<IconPlus />}>
            New catalogue
          </RailLink>
        </ul>

        {/*
          The catalogue's own sections live in the tabs beside its name, and only there. Putting
          them in the rail as well would mean two "Films" links on one screen — a second place to
          look, a second place to keep in step, and nothing gained.
        */}
        {catalogue ? (
          <div className="mt-7 rounded-[var(--radius-card)] border border-[var(--color-l-line)] px-3 py-2.5">
            <p className="type-label text-[var(--color-l-text-mid)]">Editing</p>
            <p className="mt-1 truncate text-[13px] font-semibold">{catalogue.name}</p>
          </div>
        ) : null}

        <div className="mt-auto border-t border-[var(--color-l-line)] pt-3">
          <p className="truncate px-3 text-[13px] font-medium">{operatorName}</p>
          {operatorEmail ? (
            <p className="mb-1 truncate px-3 text-[12px] text-[var(--color-l-text-mid)]">
              {operatorEmail}
            </p>
          ) : null}
          <SignOutButton />
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-l-line)] bg-[var(--color-l-surface-1)] px-4 py-2.5 md:hidden">
          <Link href="/admin" className="text-[17px] font-bold">
            Mehfil
          </Link>
          <div className="ms-auto flex items-center gap-1 text-[13px]">
            <Link
              href="/admin"
              className="rounded-[var(--radius-pill)] px-3 py-1.5 hover:bg-[var(--color-l-surface-2)]"
            >
              Catalogues
            </Link>
            <Link
              href="/admin/new"
              className="rounded-[var(--radius-pill)] bg-accent px-3 py-1.5 font-semibold text-accent-ink"
            >
              New
            </Link>
          </div>
        </div>

        {catalogue ? (
          <header className="border-b border-[var(--color-l-line)] bg-[var(--color-l-surface-1)] px-5 pt-4">
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-1 text-[13px] text-[var(--color-l-text-mid)] hover:text-[var(--color-l-text-hi)]"
            >
              <span aria-hidden>←</span> All catalogues
            </Link>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-[22px] font-bold tracking-[-0.01em]">{catalogue.name}</h1>
              <StatusPill status={catalogue.status} />
              <code className="rounded bg-[var(--color-l-surface-2)] px-1.5 py-0.5 text-[12px] text-[var(--color-l-text-mid)]">
                /{catalogue.slug}
              </code>
            </div>

            <ul className="mt-3 flex flex-wrap gap-1 border-b border-transparent">
              <TabLink href={`/admin/c/${catalogue.id}`} exact>
                Overview
              </TabLink>
              <TabLink href={`/admin/c/${catalogue.id}/titles`}>Films</TabLink>
              <TabLink href={`/admin/c/${catalogue.id}/photos`}>Photographs</TabLink>
              <TabLink href={`/admin/c/${catalogue.id}/customizer`}>Customizer</TabLink>
              <TabLink href={`/admin/c/${catalogue.id}/settings`}>Settings</TabLink>
            </ul>
          </header>
        ) : null}

        <main className="p-5">{children}</main>
      </div>
    </div>
  )
}

/**
 * Draft and live, said in two channels rather than one.
 *
 * A colour alone fails for the ~8% of men with a red-green deficiency and disappears entirely in
 * a screenshot pasted into a chat, which is how these get discussed.
 */
export function StatusPill({ status }: { status: string }) {
  const live = status === 'published'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1 type-label ${
        live
          ? 'bg-[color-mix(in_srgb,var(--color-ok)_16%,white)] text-[#1c5f2a]'
          : 'bg-[var(--color-l-surface-2)] text-[var(--color-l-text-mid)]'
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-l-text-mid)]'}`}
      />
      {live ? 'Live' : 'Draft'}
    </span>
  )
}
