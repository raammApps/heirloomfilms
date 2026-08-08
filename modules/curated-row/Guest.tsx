'use client'

import { PosterRow } from '@/components/streaming/PosterRow'
import type { RowItem } from '@/components/streaming/PosterCard'
import { useCatalogue } from '@/components/streaming/CatalogueProvider'
import { formatDurationBadge } from '@/lib/format'
import { resolveLocalised } from '@/lib/i18n'
import { categoryEyebrow } from '@/lib/poster'
import type { GuestProps } from '../contract'
import type { CuratedRowConfig } from './schema'

export default function Guest({ config, ctx }: GuestProps<CuratedRowConfig>) {
  const { openTitle, progressByTitleId, firstRowId } = useCatalogue()

  const byId = new Map(ctx.titles.map((title) => [title.id, title]))

  // Order comes from the operator's list, not from the titles table. A title that was deleted
  // or unpublished simply drops out — the row shrinks rather than erroring.
  const items: RowItem[] = config.titleIds.flatMap((id) => {
    const title = byId.get(id)
    if (!title) return []

    const progress = config.showProgress ? progressByTitleId[title.id] : undefined

    return [
      {
        id: title.id,
        key: title.slug,
        label: resolveLocalised(title.name, ctx.locale),
        eyebrow: categoryEyebrow(title.category),
        posterUrl: title.posterUrl,
        durationBadge: formatDurationBadge(title.durationS),
        ...(progress ? { progress: progress.positionS / Math.max(1, progress.durationS) } : {}),
        alt: resolveLocalised(title.name, ctx.locale),
      },
    ]
  })

  return (
    <PosterRow
      heading={ctx.heading}
      items={items}
      aspect={config.aspect}
      onOpen={(item) => openTitle(item.key)}
      t={ctx.t}
      eagerFirstCards={ctx.instanceId === firstRowId}
    />
  )
}
