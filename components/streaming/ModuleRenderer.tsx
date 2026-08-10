'use client'

import { createTranslator, resolveLocalised } from '@/lib/i18n'
import type { Album, Catalogue, Locale, ModuleInstance, Photo, Title } from '@/lib/schema'
import { resolveInstances } from '@/modules/registry'
import type { GuestContext } from '@/modules/contract'

type Props = {
  modules: ModuleInstance[]
  catalogue: Catalogue
  titles: Title[]
  albums: Album[]
  photos: Photo[]
  locale: Locale
  profileId: string | null
}

/**
 * Walks `catalogue.modules` in order and renders each one from the registry.
 *
 * **This component contains no switch on module type.** If adding a module means editing this
 * file, doc 14's abstraction has leaked (doc 08 `<ModuleRenderer>`, doc 14 §7).
 */
export function ModuleRenderer({
  modules,
  catalogue,
  titles,
  albums,
  photos,
  locale,
  profileId,
}: Props) {
  const resolved = resolveInstances(modules)
  const t = createTranslator(locale)

  // Accumulated in page order so each section knows what the guest has already been shown, and
  // a self-filling row does not repeat the row above it. Driven entirely by each module's own
  // `consumes`, so this file still names no module type.
  const consumed: string[] = []

  return (
    <>
      {resolved.map(({ instance, definition, config }) => {
        const ctx: GuestContext = {
          catalogue,
          titles,
          albums,
          photos,
          locale,
          t,
          profileId,
          heading: resolveLocalised(instance.title, locale),
          instanceId: instance.id,
          consumedTitleIds: [...consumed],
        }

        const spend = definition.consumes?.(config, ctx) ?? []
        for (const id of spend) if (!consumed.includes(id)) consumed.push(id)

        const Guest = definition.Guest as React.ComponentType<{ config: unknown; ctx: GuestContext }>

        return (
          <div key={instance.id} data-module-type={instance.type} data-module-id={instance.id}>
            <Guest config={config} ctx={ctx} />
          </div>
        )
      })}
    </>
  )
}
