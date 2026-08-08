import { log } from '@/lib/log'
import type { Album, Catalogue, ModuleInstance, Title } from '@/lib/schema'
import billboard from './billboard'
import curatedRow from './curated-row'
import letter from './letter'
import photoGrid from './photo-grid'
import photoRow from './photo-row'
import type { ModuleDefinition, ValidatedInstance } from './contract'

/**
 * The ONLY place a module is wired in (CLAUDE.md, doc 14 §4).
 *
 * Adding a module is one import and one entry here. Nothing else in the codebase may switch on
 * module type — `<ModuleRenderer>` and the customizer both drive off this map.
 */
const REGISTRY = {
  billboard,
  curated_row: curatedRow,
  photo_row: photoRow,
  letter,
  photo_grid: photoGrid,
} as const

export type ModuleType = keyof typeof REGISTRY

// The registry is intentionally heterogeneous; each entry validates its own config, so the
// erased view is what callers work with.
const modules = REGISTRY as unknown as Record<string, ModuleDefinition<unknown>>

export function getModule(type: string): ModuleDefinition<unknown> | null {
  return modules[type] ?? null
}

export function listModules(options?: { phase?: number }): ModuleDefinition<unknown>[] {
  return Object.values(modules)
    .filter((m) => options?.phase === undefined || m.meta.phase <= options.phase)
    .sort((a, b) => a.meta.label.localeCompare(b.meta.label))
}

export function moduleTypes(): string[] {
  return Object.keys(modules)
}

/**
 * Resolve an ordered list of instances to renderable, config-validated modules.
 *
 * An unknown type or an invalid config renders nothing and logs server-side. A stale module
 * type must never crash a live wedding page (doc 08 `<ModuleRenderer>`).
 */
export function resolveInstances(instances: ModuleInstance[]): ValidatedInstance[] {
  return [...instances]
    .filter((instance) => instance.enabled)
    .sort((a, b) => a.order - b.order)
    .flatMap((instance) => {
      const definition = getModule(instance.type)
      if (!definition) {
        log.warn('module registry: unknown type skipped', {
          type: instance.type,
          instanceId: instance.id,
        })
        return []
      }

      const parsed = definition.schema.safeParse(instance.config)
      if (!parsed.success) {
        log.warn('module registry: invalid config skipped', {
          type: instance.type,
          instanceId: instance.id,
          issues: parsed.error.issues.map((i) => i.path.join('.')),
        })
        return []
      }

      return [{ instance, definition, config: parsed.data }]
    })
}

/**
 * The instance id of the first row-shaped section on the page. Its first two cards load
 * eagerly; everything else is lazy (doc 08 `<PosterRow>`).
 */
export function firstRowInstanceId(instances: ModuleInstance[]): string | null {
  const row = resolveInstances(instances).find((entry) => entry.instance.type !== 'billboard')
  return row?.instance.id ?? null
}

/** Build a fresh instance of a type, with the module's own defaults. */
export function instantiate(
  type: string,
  order: number,
  catalogue: Catalogue,
  titles: Title[],
  albums: Album[],
): ModuleInstance | null {
  const definition = getModule(type)
  if (!definition) return null

  return {
    id: `m_${Math.random().toString(36).slice(2, 10)}`,
    type,
    enabled: true,
    order,
    title: { en: definition.meta.label },
    config: definition.defaults(catalogue, titles, albums) as Record<string, unknown>,
  }
}
