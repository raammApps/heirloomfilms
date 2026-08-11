import { randomUUID } from 'node:crypto'
import { ApiError } from '@/lib/http/errors'
import type {
  Album,
  Catalogue,
  ModuleState,
  Operator,
  Org,
  PlaybackProgress,
  PlayEvent,
  Photo,
  Profile,
  Title,
} from '@/lib/schema'
import type { CatalogueFilter, CreateTitleInput, Repository } from './repository'

export type Snapshot = {
  orgs: Org[]
  operators: Operator[]
  catalogues: Catalogue[]
  titles: Title[]
  albums: Album[]
  photos: Photo[]
  profiles: Profile[]
  progress: PlaybackProgress[]
  moduleStates: ModuleState[]
  playEvents: PlayEvent[]
  usage: { catalogueId: string; month: string; storedGb: number; deliveredGb: number }[]
}

export function emptySnapshot(): Snapshot {
  return {
    orgs: [],
    operators: [],
    catalogues: [],
    titles: [],
    albums: [],
    photos: [],
    profiles: [],
    progress: [],
    moduleStates: [],
    playEvents: [],
    usage: [],
  }
}

/**
 * In-process implementation of `Repository`.
 *
 * Backs the test suites, CI, and `DATA_DRIVER=memory|file`. `persist()` is the hook the file
 * driver overrides; in memory it is a no-op.
 */
export class MemoryRepository implements Repository {
  protected data: Snapshot

  constructor(snapshot: Snapshot = emptySnapshot()) {
    this.data = snapshot
  }

  /** Structured-clone on the way out so callers cannot mutate the store by accident. */
  private clone<T>(value: T): T {
    return structuredClone(value)
  }

  /** Called after every mutation. Overridden by `FileRepository`. */
  protected persist(): void {}

  private touched(): void {
    this.persist()
  }

  snapshot(): Snapshot {
    return this.clone(this.data)
  }

  // ── Orgs & operators ────────────────────────────────────────────────────────
  async getOrg(id: string): Promise<Org | null> {
    return this.clone(this.data.orgs.find((o) => o.id === id) ?? null)
  }

  async getOperatorByEmail(email: string): Promise<Operator | null> {
    const needle = email.trim().toLowerCase()
    return this.clone(this.data.operators.find((o) => o.email.toLowerCase() === needle) ?? null)
  }

  async getOperator(id: string): Promise<Operator | null> {
    return this.clone(this.data.operators.find((o) => o.id === id) ?? null)
  }

  // ── Catalogues ──────────────────────────────────────────────────────────────
  async listCatalogues({ orgId }: CatalogueFilter): Promise<Catalogue[]> {
    return this.clone(
      this.data.catalogues
        .filter((c) => c.orgId === orgId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )
  }

  async getCatalogue(id: string, orgId: string): Promise<Catalogue | null> {
    return this.clone(
      this.data.catalogues.find((c) => c.id === id && c.orgId === orgId) ?? null,
    )
  }

  async getCatalogueById(id: string): Promise<Catalogue | null> {
    return this.clone(this.data.catalogues.find((c) => c.id === id) ?? null)
  }

  async getCatalogueBySlug(slug: string): Promise<Catalogue | null> {
    return this.clone(this.data.catalogues.find((c) => c.slug === slug) ?? null)
  }

  async getCatalogueByCustomDomain(host: string): Promise<Catalogue | null> {
    return this.clone(this.data.catalogues.find((c) => c.customDomain === host) ?? null)
  }

  async slugAvailable(slug: string): Promise<boolean> {
    return !this.data.catalogues.some((c) => c.slug === slug)
  }

  async createCatalogue(catalogue: Catalogue): Promise<Catalogue> {
    if (!(await this.slugAvailable(catalogue.slug))) {
      throw new ApiError('VALIDATION_FAILED', 'That address is taken', {
        fields: { slug: 'That address is already in use' },
      })
    }
    this.data.catalogues.push(this.clone(catalogue))
    this.touched()
    return this.clone(catalogue)
  }

  async updateCatalogue(
    id: string,
    orgId: string,
    patch: Partial<Omit<Catalogue, 'id' | 'orgId'>>,
  ): Promise<Catalogue> {
    const index = this.data.catalogues.findIndex((c) => c.id === id && c.orgId === orgId)
    if (index === -1) throw new ApiError('NOT_FOUND', 'Catalogue not found')
    const next = { ...this.data.catalogues[index]!, ...this.clone(patch) }
    this.data.catalogues[index] = next
    this.touched()
    return this.clone(next)
  }

  async deleteCatalogue(id: string, orgId: string): Promise<void> {
    const owned = this.data.catalogues.find((c) => c.id === id && c.orgId === orgId)
    if (!owned) throw new ApiError('NOT_FOUND', 'Catalogue not found')

    const titleIds = new Set(this.data.titles.filter((t) => t.catalogueId === id).map((t) => t.id))
    const albumIds = new Set(this.data.albums.filter((a) => a.catalogueId === id).map((a) => a.id))
    const profileIds = new Set(this.data.profiles.filter((p) => p.catalogueId === id).map((p) => p.id))

    // Mirrors the `on delete cascade` chain in Postgres, so both drivers leave the same shape.
    this.data.catalogues = this.data.catalogues.filter((c) => c.id !== id)
    this.data.titles = this.data.titles.filter((t) => !titleIds.has(t.id))
    this.data.photos = this.data.photos.filter((p) => !albumIds.has(p.albumId))
    this.data.albums = this.data.albums.filter((a) => !albumIds.has(a.id))
    this.data.profiles = this.data.profiles.filter((p) => !profileIds.has(p.id))
    this.data.progress = this.data.progress.filter((p) => !profileIds.has(p.profileId))
    this.data.moduleStates = this.data.moduleStates.filter((m) => !profileIds.has(m.profileId))
    this.data.playEvents = this.data.playEvents.filter((e) => e.catalogueId !== id)
    this.data.usage = this.data.usage.filter((u) => u.catalogueId !== id)
    this.touched()
  }

  // ── Titles ──────────────────────────────────────────────────────────────────
  async listTitles(catalogueId: string, options?: { publishedOnly?: boolean }): Promise<Title[]> {
    return this.clone(
      this.data.titles
        .filter((t) => t.catalogueId === catalogueId)
        .filter((t) => !options?.publishedOnly || (t.published && t.status === 'ready'))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    )
  }

  async getTitle(id: string): Promise<Title | null> {
    return this.clone(this.data.titles.find((t) => t.id === id) ?? null)
  }

  async getTitleBySlug(catalogueId: string, slug: string): Promise<Title | null> {
    return this.clone(
      this.data.titles.find((t) => t.catalogueId === catalogueId && t.slug === slug) ?? null,
    )
  }

  async getTitleByProviderId(providerId: string): Promise<Title | null> {
    return this.clone(this.data.titles.find((t) => t.providerId === providerId) ?? null)
  }

  async createTitle(input: CreateTitleInput): Promise<Title> {
    const title: Title = {
      createdAt: new Date().toISOString(),
      publishedAt: null,
      viewCount: 0,
      watchSeconds: 0,
      ...input,
    }
    this.data.titles.push(this.clone(title))
    this.touched()
    return this.clone(title)
  }

  async updateTitle(id: string, patch: Partial<Omit<Title, 'id' | 'catalogueId'>>): Promise<Title> {
    const index = this.data.titles.findIndex((t) => t.id === id)
    if (index === -1) throw new ApiError('NOT_FOUND', 'Title not found')
    const next = { ...this.data.titles[index]!, ...this.clone(patch) }
    this.data.titles[index] = next
    this.touched()
    return this.clone(next)
  }

  async deleteTitle(id: string): Promise<void> {
    this.data.titles = this.data.titles.filter((t) => t.id !== id)
    this.data.progress = this.data.progress.filter((p) => p.titleId !== id)
    this.touched()
  }

  async reorderTitles(catalogueId: string, order: { id: string; sortOrder: number }[]): Promise<void> {
    for (const { id, sortOrder } of order) {
      const title = this.data.titles.find((t) => t.id === id && t.catalogueId === catalogueId)
      if (title) title.sortOrder = sortOrder
    }
    this.touched()
  }

  // ── Albums & photos ─────────────────────────────────────────────────────────
  async listAlbums(catalogueId: string): Promise<Album[]> {
    return this.clone(this.data.albums.filter((a) => a.catalogueId === catalogueId))
  }

  async listPhotos(albumId: string): Promise<Photo[]> {
    return this.clone(
      this.data.photos.filter((p) => p.albumId === albumId).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }

  async listPhotosForCatalogue(catalogueId: string): Promise<Photo[]> {
    const albumIds = new Set(
      this.data.albums.filter((a) => a.catalogueId === catalogueId).map((a) => a.id),
    )
    return this.clone(
      this.data.photos
        .filter((p) => albumIds.has(p.albumId))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    )
  }

  async getAlbum(id: string): Promise<Album | null> {
    return this.clone(this.data.albums.find((a) => a.id === id) ?? null)
  }

  async createAlbum(album: Album): Promise<Album> {
    this.data.albums.push(this.clone(album))
    this.touched()
    return this.clone(album)
  }

  async createPhoto(photo: Photo): Promise<Photo> {
    this.data.photos.push(this.clone(photo))
    this.touched()
    return this.clone(photo)
  }

  // ── Guests ──────────────────────────────────────────────────────────────────
  async getPhoto(id: string): Promise<Photo | null> {
    return this.clone(this.data.photos.find((p) => p.id === id) ?? null)
  }

  async deletePhoto(id: string): Promise<void> {
    this.data.photos = this.data.photos.filter((p) => p.id !== id)
  }

  async createProfile(profile: Profile): Promise<Profile> {
    this.data.profiles.push(this.clone(profile))
    this.touched()
    return this.clone(profile)
  }

  async getProfile(id: string): Promise<Profile | null> {
    return this.clone(this.data.profiles.find((p) => p.id === id) ?? null)
  }

  async upsertProgress(progress: PlaybackProgress): Promise<void> {
    const index = this.data.progress.findIndex(
      (p) => p.profileId === progress.profileId && p.titleId === progress.titleId,
    )
    if (index === -1) this.data.progress.push(this.clone(progress))
    else this.data.progress[index] = this.clone(progress)
    this.touched()
  }

  async getProgress(profileId: string, titleId: string): Promise<PlaybackProgress | null> {
    return this.clone(
      this.data.progress.find((p) => p.profileId === profileId && p.titleId === titleId) ?? null,
    )
  }

  async listProgress(profileId: string): Promise<PlaybackProgress[]> {
    return this.clone(this.data.progress.filter((p) => p.profileId === profileId))
  }

  async upsertModuleState(state: ModuleState): Promise<void> {
    const index = this.data.moduleStates.findIndex(
      (s) => s.profileId === state.profileId && s.moduleId === state.moduleId,
    )
    if (index === -1) this.data.moduleStates.push(this.clone(state))
    else this.data.moduleStates[index] = this.clone(state)
    this.touched()
  }

  async getModuleState(profileId: string, moduleId: string): Promise<ModuleState | null> {
    return this.clone(
      this.data.moduleStates.find((s) => s.profileId === profileId && s.moduleId === moduleId) ??
        null,
    )
  }

  // ── Ops ─────────────────────────────────────────────────────────────────────
  async recordPlayEvent(event: {
    catalogueId: string
    titleId: string
    profileId: string | null
    seconds: number
  }): Promise<void> {
    this.data.playEvents.push({ id: randomUUID(), at: new Date().toISOString(), ...event })

    const title = this.data.titles.find((t) => t.id === event.titleId)
    if (title) title.watchSeconds += event.seconds
    this.touched()
  }

  async listAllCatalogues(): Promise<Catalogue[]> {
    return this.clone(this.data.catalogues)
  }

  async upsertUsage(usage: {
    catalogueId: string
    month: string
    storedGb: number
    deliveredGb: number
  }): Promise<void> {
    this.data.usage ??= []
    const index = this.data.usage.findIndex(
      (u) => u.catalogueId === usage.catalogueId && u.month === usage.month,
    )
    if (index === -1) this.data.usage.push(this.clone(usage))
    else this.data.usage[index] = this.clone(usage)
    this.touched()
  }

  async listUsage(catalogueId: string) {
    return this.clone((this.data.usage ?? []).filter((u) => u.catalogueId === catalogueId))
  }

  async listStalledTitles(olderThanMinutes: number): Promise<Title[]> {
    const cutoff = Date.now() - olderThanMinutes * 60_000
    return this.clone(
      this.data.titles.filter(
        // `uploading` counts too — see the note in SupabaseRepository.listStalledTitles.
        (t) =>
          (t.status === 'processing' || t.status === 'uploading') &&
          Date.parse(t.createdAt) < cutoff,
      ),
    )
  }
}
