import type {
  Album,
  Catalogue,
  ModuleInstance,
  ModuleState,
  Operator,
  Org,
  PlaybackProgress,
  Photo,
  Profile,
  Title,
} from '@/lib/schema'

/**
 * The persistence seam.
 *
 * Doc 06 specifies Postgres, and production runs on it. This interface exists so that the
 * unit and component suites, CI, and an offline planner demo can all run against an in-memory
 * store with identical semantics — the alternative is a test suite that needs a database,
 * which in practice becomes a test suite nobody runs.
 *
 * Isolation note (doc 10 §5): every operator-facing method takes `orgId` and every guest-facing
 * one takes a catalogue. No method can read across catalogues, in any driver.
 */

export type CatalogueFilter = { orgId: string }

export type CreateTitleInput = Omit<
  Title,
  'createdAt' | 'publishedAt' | 'viewCount' | 'watchSeconds'
> &
  Partial<Pick<Title, 'createdAt' | 'publishedAt' | 'viewCount' | 'watchSeconds'>>

export interface Repository {
  // ── Orgs & operators ────────────────────────────────────────────────────────
  getOrg(id: string): Promise<Org | null>
  getOperatorByEmail(email: string): Promise<Operator | null>
  getOperator(id: string): Promise<Operator | null>

  // ── Catalogues ──────────────────────────────────────────────────────────────
  listCatalogues(filter: CatalogueFilter): Promise<Catalogue[]>
  getCatalogue(id: string, orgId: string): Promise<Catalogue | null>
  /** Unscoped lookup, for paths that already hold a trusted id (webhooks, ISR revalidation). */
  getCatalogueById(id: string): Promise<Catalogue | null>
  /** Guest path: resolve by subdomain label with no org scope. */
  getCatalogueBySlug(slug: string): Promise<Catalogue | null>
  getCatalogueByCustomDomain(host: string): Promise<Catalogue | null>
  slugAvailable(slug: string): Promise<boolean>
  createCatalogue(catalogue: Catalogue): Promise<Catalogue>
  updateCatalogue(
    id: string,
    orgId: string,
    patch: Partial<Omit<Catalogue, 'id' | 'orgId'>>,
  ): Promise<Catalogue>

  // ── Titles ──────────────────────────────────────────────────────────────────
  listTitles(catalogueId: string, options?: { publishedOnly?: boolean }): Promise<Title[]>
  getTitle(id: string): Promise<Title | null>
  getTitleBySlug(catalogueId: string, slug: string): Promise<Title | null>
  getTitleByProviderId(providerId: string): Promise<Title | null>
  createTitle(title: CreateTitleInput): Promise<Title>
  updateTitle(id: string, patch: Partial<Omit<Title, 'id' | 'catalogueId'>>): Promise<Title>
  deleteTitle(id: string): Promise<void>
  reorderTitles(catalogueId: string, order: { id: string; sortOrder: number }[]): Promise<void>

  // ── Albums & photos ─────────────────────────────────────────────────────────
  listAlbums(catalogueId: string): Promise<Album[]>
  listPhotos(albumId: string): Promise<Photo[]>
  listPhotosForCatalogue(catalogueId: string): Promise<Photo[]>
  createAlbum(album: Album): Promise<Album>
  createPhoto(photo: Photo): Promise<Photo>

  // ── Guests ──────────────────────────────────────────────────────────────────
  createProfile(profile: Profile): Promise<Profile>
  getProfile(id: string): Promise<Profile | null>
  upsertProgress(progress: PlaybackProgress): Promise<void>
  getProgress(profileId: string, titleId: string): Promise<PlaybackProgress | null>
  listProgress(profileId: string): Promise<PlaybackProgress[]>
  upsertModuleState(state: ModuleState): Promise<void>
  getModuleState(profileId: string, moduleId: string): Promise<ModuleState | null>

  // ── Ops ─────────────────────────────────────────────────────────────────────
  recordPlayEvent(event: {
    catalogueId: string
    titleId: string
    profileId: string | null
    seconds: number
  }): Promise<void>

  /** Titles stuck in `processing` past `olderThanMinutes` — the reconciliation job's input. */
  listStalledTitles(olderThanMinutes: number): Promise<Title[]>
}

/** Convenience: draft modules if the customizer has unpublished edits, otherwise live. */
export function effectiveModules(catalogue: Catalogue, preferDraft: boolean): ModuleInstance[] {
  const source = preferDraft && catalogue.draftModules ? catalogue.draftModules : catalogue.modules
  return [...source].sort((a, b) => a.order - b.order)
}
