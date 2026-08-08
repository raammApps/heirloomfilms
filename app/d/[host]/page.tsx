import { notFound, redirect } from 'next/navigation'
import { getRepository } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Custom-domain landing (doc 05 §5).
 *
 * Middleware cannot query the database, so it rewrites an unrecognised host here and this
 * server component does the lookup, then re-enters the normal catalogue route.
 */
export default async function CustomDomainPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params
  const catalogue = await getRepository().getCatalogueByCustomDomain(decodeURIComponent(host))
  if (!catalogue) notFound()
  redirect(`/c/${catalogue.slug}`)
}
