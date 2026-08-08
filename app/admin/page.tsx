import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminChrome, StatusPill } from '@/components/admin/AdminChrome'
import { getOperatorSession } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { formatWeddingDate } from '@/lib/format'
import { catalogueUrl } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/** AE-2 — every wedding this operator manages, with status and subscription state. */
export default async function CatalogueListPage() {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  const catalogues = await getRepository().listCatalogues({ orgId: session.orgId })

  return (
    <AdminChrome operatorName={session.operator.name}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold">Catalogues</h1>
        <Link
          href="/admin/new"
          className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-accent px-5 font-semibold text-accent-ink"
        >
          New catalogue
        </Link>
      </div>

      {catalogues.length === 0 ? (
        <p className="text-[15px] text-[var(--color-l-text-mid)]">
          No catalogues yet. Creating one takes about half an hour, most of it uploading.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {catalogues.map((catalogue) => (
            <li
              key={catalogue.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link href={`/admin/c/${catalogue.id}`} className="text-[17px] font-semibold">
                  {catalogue.coupleName.en}
                </Link>
                <StatusPill status={catalogue.status} />
              </div>

              <p className="text-[13px] text-[var(--color-l-text-mid)]">
                {formatWeddingDate(catalogue.weddingDate, 'en')}
              </p>

              <p className="mt-3 truncate text-[12px] text-[var(--color-l-text-mid)]">
                {catalogueUrl(catalogue.slug, env.ROOT_DOMAIN)}
              </p>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/admin/c/${catalogue.id}/titles`}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-3 py-1.5 text-[13px]"
                >
                  Films
                </Link>
                <Link
                  href={`/admin/c/${catalogue.id}/customizer`}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-3 py-1.5 text-[13px]"
                >
                  Customizer
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminChrome>
  )
}
