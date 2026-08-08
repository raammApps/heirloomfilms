import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleInstance } from '@/lib/schema'
import { firstRowInstanceId, getModule, listModules, moduleTypes, resolveInstances } from '@/modules/registry'

/** doc 10 §1 tests 2 and 3. */

function instance(overrides: Partial<ModuleInstance>): ModuleInstance {
  return {
    id: 'm1',
    type: 'curated_row',
    enabled: true,
    order: 0,
    title: { en: 'Row' },
    config: { titleIds: [], aspect: '2:3', showProgress: false },
    ...overrides,
  }
}

describe('resolveInstances', () => {
  it('renders nothing and does not throw for an unknown type', () => {
    const resolved = resolveInstances([instance({ type: 'quiz', id: 'stale' })])
    expect(resolved).toHaveLength(0)
  })

  it('skips disabled modules', () => {
    const resolved = resolveInstances([instance({ enabled: false })])
    expect(resolved).toHaveLength(0)
  })

  it('respects order regardless of array position', () => {
    const resolved = resolveInstances([
      instance({ id: 'b', order: 2 }),
      instance({ id: 'a', order: 1 }),
      instance({ id: 'c', order: 0, type: 'billboard', config: { featuredRef: null } }),
    ])
    expect(resolved.map((entry) => entry.instance.id)).toEqual(['c', 'a', 'b'])
  })

  it('skips an instance whose config fails its own schema, without throwing', () => {
    const resolved = resolveInstances([instance({ config: { titleIds: 'not-an-array' } })])
    expect(resolved).toHaveLength(0)
  })

  it('applies schema defaults so a partial config still renders', () => {
    const resolved = resolveInstances([instance({ config: {} })])
    expect(resolved).toHaveLength(1)
    expect(resolved[0]!.config).toMatchObject({ titleIds: [], aspect: '2:3' })
  })
})

describe('firstRowInstanceId', () => {
  it('is the first enabled non-billboard section', () => {
    const modules = [
      instance({ id: 'hero', type: 'billboard', order: 0, config: { featuredRef: null } }),
      instance({ id: 'row-1', order: 1 }),
      instance({ id: 'row-2', order: 2 }),
    ]
    expect(firstRowInstanceId(modules)).toBe('row-1')
  })

  it('is null when there is nothing but a billboard', () => {
    expect(
      firstRowInstanceId([
        instance({ id: 'hero', type: 'billboard', config: { featuredRef: null } }),
      ]),
    ).toBeNull()
  })
})

describe('the registry is the only wiring point', () => {
  it('exposes every Phase 0 module', () => {
    expect(moduleTypes().sort()).toEqual([
      'billboard',
      'curated_row',
      'letter',
      'photo_grid',
      'photo_row',
    ])
  })

  it('gives every module a complete definition', () => {
    for (const type of moduleTypes()) {
      const definition = getModule(type)!
      expect(definition.meta.type, `${type} meta.type must match its registry key`).toBe(type)
      expect(definition.meta.label.length).toBeGreaterThan(0)
      expect(definition.meta.description.length).toBeGreaterThan(0)
      expect(typeof definition.defaults).toBe('function')
      expect(definition.Guest).toBeTruthy()
      expect(definition.Editor).toBeTruthy()
    }
  })

  it('lists Phase 0 modules only when filtered to phase 0', () => {
    expect(listModules({ phase: 0 }).every((m) => m.meta.phase === 0)).toBe(true)
  })

  /**
   * doc 14 §7: "adding a new module type requires changes only inside `modules/<type>/` plus
   * one registry line." Asserted structurally — no file outside `modules/` may name a specific
   * module type, which is the concrete form the leak would take.
   */
  it('has no module type named outside modules/ and the seed fixture', () => {
    const types = moduleTypes()
    const offenders: string[] = []

    const skip = new Set(['node_modules', '.next', '.git', 'modules', 'coverage', 'project-doc-directory', 'tests', 'e2e', '.data', 'public'])

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (skip.has(entry)) continue
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
          walk(path)
          continue
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue

        // Templates and the demo fixture name types as *data* — that is a content list, not a
        // switch, and adding a module does not require touching them.
        if (path.includes('admin/templates.ts') || path.includes('db/seed-data.ts')) continue

        const source = readFileSync(path, 'utf8')
        for (const type of types) {
          if (source.includes(`'${type}'`) || source.includes(`"${type}"`)) {
            offenders.push(`${path} references '${type}'`)
          }
        }
      }
    }

    walk(process.cwd() + '/app')
    walk(process.cwd() + '/components')
    walk(process.cwd() + '/lib')

    expect(offenders).toEqual([])
  })
})

describe('a stale module type is logged, not fatal', () => {
  it('warns once per unknown instance', async () => {
    const { log } = await import('@/lib/log')
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {})
    resolveInstances([instance({ type: 'guestbook' })])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
