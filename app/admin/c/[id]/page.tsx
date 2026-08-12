import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { AttentionChip } from '@/components/admin/CatalogueBoard'
import { CatalogueAnalytics } from '@/components/admin/CatalogueAnalytics'
import { HandoverPanel } from '@/components/admin/HandoverPanel'
import { PublicLink } from '@/components/admin/PublicLink'
import { SetupChecklist } from '@/components/admin/SetupChecklist'
import { getOperatorSession, getSessionOrg } from '@/lib/admin/session'
import { catalogueAttention } from '@/lib/admin/catalogue-health'
import { setupChecklist } from '@/lib/admin/setup-checklist'
import { resolveLimits } from '@/lib/entitlements'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { formatWeddingDate } from '@/lib/format'
import { catalogueUrl } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function CatalogueOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const repository = getRepository()
  const catalogue = await repository.getCatalogue(id, session.orgId)
  if (!catalogue) notFound()

  const [titles, photos, org, transfer, grants] = await Promise.all([
    repository.listTitles(catalogue.id),
    repository.listPhotosForCatalogue(catalogue.id),
    getSessionOrg(session),
    repository.getLiveTransferForCatalogue(catalogue.id),
    repository.getEntitlements(catalogue.id, catalogue.orgId),
  ])

  const limits = resolveLimits(grants.catalogue, grants.org)

  const counts = {
    titles: titles.length,
    ready: titles.filter((t) => t.status === 'ready').length,
    published: titles.filter((t) => t.published).length,
    failed: titles.filter((t) => t.status === 'failed').length,
    photos: photos.length,
  }

  const checklist = setupChecklist(catalogue, counts)
  const attention = catalogueAttention({
    status: catalogue.status,
    subStatus: catalogue.subStatus,
    counts,
  })
  const url = catalogueUrl(catalogue.slug, env.ROOT_DOMAIN, '/', env.TENANCY_MODE)

  // A couple owns exactly one wedding — their own — and has nobody to hand it to. Showing them
  // the panel would only invite them to give their own catalogue away.
  const canHandOver = org?.kind === 'partner'

  return (
    <AdminChrome
      operatorName={session.operator.name}
      operatorEmail={session.operator.email}
      orgName={org?.name}
      catalogue={{
        id: catalogue.id,
        name: catalogue.coupleName.en,
        slug: catalogue.slug,
        status: catalogue.status,
      }}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <AttentionChip attention={attention} />
        <p className="text-[13px] text-[var(--color-l-text-mid)]">
          Wedding {formatWeddingDate(catalogue.weddingDate, 'en')} · included until{' '}
          {formatWeddingDate(catalogue.includedUntil, 'en')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Films" value={`${counts.titles} of ${limits.maxTitles}`} />
            <Stat label="Ready" value={`${counts.ready}`} />
            <Stat label="Shown to guests" value={`${counts.published}`} />
          </div>

          {counts.failed > 0 ? (
            <div className="mt-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-error)_40%,white)] bg-[color-mix(in_srgb,var(--color-error)_8%,white)] p-4">
              <p className="text-[14px] font-semibold">
                {counts.failed} film{counts.failed > 1 ? 's' : ''} failed to process
              </p>
              <p className="mt-1 text-[13px] text-[var(--color-l-text-mid)]">
                Nothing is silently missing —{' '}
                <Link
                  href={`/admin/c/${catalogue.id}/titles`}
                  className="font-semibold underline underline-offset-4"
                >
                  open Films
                </Link>{' '}
                to see the reason and retry.
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <CatalogueAnalytics titles={titles} />
          </div>

          <section className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
            <h2 className="text-[15px] font-semibold">The link</h2>
            <p className="mb-3 mt-1 text-[13px] text-[var(--color-l-text-mid)]">
              Unlisted and never indexed. Anyone with this link can watch.
            </p>
            <PublicLink url={url} status={catalogue.status} />
          </section>

          {canHandOver ? (
            <div className="mt-4">
              <HandoverPanel
                catalogueId={catalogue.id}
                outstanding={
                  transfer
                    ? {
                        toEmail: transfer.toEmail,
                        expiresAtLabel: formatWeddingDate(transfer.expiresAt, 'en'),
                      }
                    : null
                }
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/admin/c/${catalogue.id}/titles`}
              className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-accent px-5 font-semibold text-accent-ink"
            >
              Upload and title films
            </Link>
            <Link
              href={`/admin/c/${catalogue.id}/customizer`}
              className="inline-flex h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-5 font-semibold"
            >
              Arrange and publish
            </Link>
          </div>
        </div>

        <SetupChecklist checklist={checklist} />
      </div>
    </AdminChrome>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
      <p className="type-label text-[var(--color-l-text-mid)]">{label}</p>
      <p className="mt-1 text-[24px] font-bold tracking-[-0.02em]">{value}</p>
    </div>
  )
}
