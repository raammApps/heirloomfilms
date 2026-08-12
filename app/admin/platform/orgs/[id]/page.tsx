import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StatusPill } from '@/components/admin/AdminChrome'
import { getPlatformAdmin } from '@/lib/admin/platform'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { formatWeddingDate } from '@/lib/format'
import { catalogueUrl } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * One org's catalogues, for when a partner writes in asking why something looks wrong (N-16).
 *
 * **Read-only, and no deeper than this.** It lists what exists and links to the guest page a
 * guest would see. There is no route from here into the customizer, the films tab or any write
 * endpoint — support means being able to describe what the partner is describing, not being able
 * to change it. Anything more should be a thing the partner does while you watch.
 */
export default async function PlatformOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin()
  if (!admin) notFound()

  const { id } = await params
  const repository = getRepository()
  const org = await repository.getOrg(id)
  if (!org) notFound()

  // The one place an org id from the URL is trusted — and it is safe precisely because the
  // caller has already been proven to be a platform admin, who by design belongs to no org and
  // therefore cannot be "escalating" into one.
  const catalogues = await repository.listCatalogues({ orgId: org.id })

  return (
    <div className="mx-auto min-h-svh w-full max-w-[1100px] p-6">
      <Link
        href="/admin/platform"
        className="mb-3 inline-flex items-center gap-1 text-[13px] text-[var(--color-l-text-mid)] hover:text-[var(--color-l-text-hi)]"
      >
        <span aria-hidden>←</span> All orgs
      </Link>

      <header className="mb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.01em]">{org.name}</h1>
        <p className="mt-0.5 text-[14px] text-[var(--color-l-text-mid)]">
          {org.kind} · <code className="text-[12px]">{org.slug}</code> · read-only
        </p>
      </header>

      {catalogues.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-l-line)] px-4 py-10 text-center text-[14px] text-[var(--color-l-text-mid)]">
          This org has no catalogues.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {catalogues.map((catalogue) => (
            <li
              key={catalogue.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-[16px] font-semibold">{catalogue.coupleName.en}</p>
                <StatusPill status={catalogue.status} />
              </div>
              <p className="text-[13px] text-[var(--color-l-text-mid)]">
                {formatWeddingDate(catalogue.weddingDate, 'en')} · included until{' '}
                {formatWeddingDate(catalogue.includedUntil, 'en')}
              </p>
              <p className="mt-2">
                {/* The guest page, which is what a partner is usually describing. */}
                <a
                  href={catalogueUrl(catalogue.slug, env.ROOT_DOMAIN, '/', env.TENANCY_MODE)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[12px] underline underline-offset-4"
                >
                  /{catalogue.slug}
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
