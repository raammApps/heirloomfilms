import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { getOperatorSession } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { formatWeddingDate } from '@/lib/format'
import { catalogueUrl } from '@/lib/tenant'
import { MAX_TITLES } from '@/lib/schema'

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

  const titles = await repository.listTitles(catalogue.id)
  const ready = titles.filter((t) => t.status === 'ready').length
  const published = titles.filter((t) => t.published).length
  const failed = titles.filter((t) => t.status === 'failed')
  const url = catalogueUrl(catalogue.slug, env.ROOT_DOMAIN)

  return (
    <AdminChrome
      operatorName={session.operator.name}
      catalogue={{
        id: catalogue.id,
        name: catalogue.coupleName.en,
        slug: catalogue.slug,
        status: catalogue.status,
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Films" value={`${titles.length} of ${MAX_TITLES}`} />
        <Stat label="Ready" value={`${ready}`} />
        <Stat label="Published" value={`${published}`} />
      </div>

      {failed.length > 0 ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-error)_40%,white)] bg-[color-mix(in_srgb,var(--color-error)_8%,white)] p-4">
          <p className="text-[14px] font-semibold">
            {failed.length} film{failed.length > 1 ? 's' : ''} failed to process
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-l-text-mid)]">
            Nothing is silently missing — open the Films tab to see the reason and retry.
          </p>
        </div>
      ) : null}

      <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
        <h2 className="mb-1 text-[15px] font-semibold">The link</h2>
        <p className="mb-3 text-[13px] text-[var(--color-l-text-mid)]">
          Unlisted and never indexed. Anyone with this link can watch.
        </p>
        <code className="block break-all rounded bg-[var(--color-l-surface-2)] px-3 py-2 text-[13px]">
          {url}
        </code>
        <p className="mt-2 text-[12px] text-[var(--color-l-text-mid)]">
          Wedding date {formatWeddingDate(catalogue.weddingDate, 'en')} · included until{' '}
          {formatWeddingDate(catalogue.includedUntil, 'en')}
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
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
    </AdminChrome>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
      <p className="text-[12px] uppercase tracking-[0.09em] text-[var(--color-l-text-mid)]">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-bold">{value}</p>
    </div>
  )
}
