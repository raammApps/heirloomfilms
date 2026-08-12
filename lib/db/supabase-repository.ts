import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { ApiError } from '@/lib/http/errors'
import type {
  Album,
  Transfer,
  Catalogue,
  ModuleState,
  Operator,
  Org,
  PlaybackProgress,
  Photo,
  Profile,
  Title,
} from '@/lib/schema'
import type { CatalogueFilter, CreateTitleInput, Repository } from './repository'

/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase rows are untyped JSON at this
   boundary; every row is narrowed by an explicit mapper immediately below. */
type Row = Record<string, any>

/**
 * Postgres implementation of `Repository` (doc 06).
 *
 * Runs with the service-role key, which is why it is `server-only`: the key must never be
 * reachable from a browser bundle (doc 10 §5). RLS still exists and is still the enforcement
 * boundary for anything the anon key touches — this class carries the *second* layer, scoping
 * every operator query by `org_id` taken from the session rather than from the request.
 */
export class SupabaseRepository implements Repository {
  private readonly db: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.db =
      client ??
      createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
  }

  private static unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
    if (result.error) throw new ApiError('INTERNAL', result.error.message)
    if (result.data === null) throw new ApiError('NOT_FOUND', 'Row not found')
    return result.data
  }

  // ── Mappers ─────────────────────────────────────────────────────────────────
  private static toOrg(r: Row): Org {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      kind: r.kind ?? 'partner',
      branding: r.branding ?? {},
      createdAt: r.created_at,
    }
  }

  private static toOperator(r: Row): Operator {
    return {
      id: r.id,
      orgId: r.org_id,
      email: r.email,
      name: r.name,
      role: r.role,
      passwordHash: r.password_hash ?? '',
      createdAt: r.created_at,
    }
  }

  private static toCatalogue(r: Row): Catalogue {
    return {
      id: r.id,
      orgId: r.org_id,
      slug: r.slug,
      customDomain: r.custom_domain,
      coupleName: r.couple_name,
      appName: r.app_name,
      weddingDate: r.wedding_date,
      city: r.city ?? undefined,
      synopsis: r.synopsis ?? undefined,
      occasion: r.occasion,
      branding: r.branding ?? {},
      featuredTitleId: r.featured_title_id,
      modules: r.modules ?? [],
      draftModules: r.draft_modules,
      template: r.template,
      status: r.status,
      privacy: r.privacy,
      passcodeHash: r.passcode_hash,
      includedUntil: r.included_until,
      subStatus: r.sub_status,
      subPlan: r.sub_plan,
      subUntil: r.sub_until,
      createdAt: r.created_at,
      publishedAt: r.published_at,
    }
  }

  private static fromCatalogue(c: Partial<Catalogue>): Row {
    const row: Row = {}
    const map: Record<string, string> = {
      id: 'id',
      orgId: 'org_id',
      slug: 'slug',
      customDomain: 'custom_domain',
      coupleName: 'couple_name',
      appName: 'app_name',
      weddingDate: 'wedding_date',
      city: 'city',
      synopsis: 'synopsis',
      occasion: 'occasion',
      branding: 'branding',
      featuredTitleId: 'featured_title_id',
      modules: 'modules',
      draftModules: 'draft_modules',
      template: 'template',
      status: 'status',
      privacy: 'privacy',
      passcodeHash: 'passcode_hash',
      includedUntil: 'included_until',
      subStatus: 'sub_status',
      subPlan: 'sub_plan',
      subUntil: 'sub_until',
      createdAt: 'created_at',
      publishedAt: 'published_at',
    }
    for (const [key, column] of Object.entries(map)) {
      const value = (c as Row)[key]
      if (value !== undefined) row[column] = value
    }
    return row
  }

  private static toTitle(r: Row): Title {
    return {
      id: r.id,
      catalogueId: r.catalogue_id,
      slug: r.slug,
      name: r.name,
      synopsis: r.synopsis ?? undefined,
      category: r.category,
      credits: r.credits ?? [],
      provider: r.provider,
      providerId: r.provider_id,
      durationS: r.duration_s,
      posterUrl: r.poster_url,
      posterCandidates: r.poster_candidates ?? [],
      posterSource: r.poster_source,
      thumbnailsUrl: r.thumbnails_url,
      trailerUrl: r.trailer_url,
      captions: r.captions ?? [],
      status: r.status,
      errorMessage: r.error_message,
      published: r.published,
      sortOrder: r.sort_order,
      publishedAt: r.published_at,
      createdAt: r.created_at,
      viewCount: r.view_count ?? 0,
      watchSeconds: r.watch_seconds ?? 0,
    }
  }

  private static fromTitle(t: Partial<Title>): Row {
    const row: Row = {}
    const map: Record<string, string> = {
      id: 'id',
      catalogueId: 'catalogue_id',
      slug: 'slug',
      name: 'name',
      synopsis: 'synopsis',
      category: 'category',
      credits: 'credits',
      provider: 'provider',
      providerId: 'provider_id',
      durationS: 'duration_s',
      posterUrl: 'poster_url',
      posterCandidates: 'poster_candidates',
      posterSource: 'poster_source',
      thumbnailsUrl: 'thumbnails_url',
      trailerUrl: 'trailer_url',
      captions: 'captions',
      status: 'status',
      errorMessage: 'error_message',
      published: 'published',
      sortOrder: 'sort_order',
      publishedAt: 'published_at',
      createdAt: 'created_at',
      viewCount: 'view_count',
      watchSeconds: 'watch_seconds',
    }
    for (const [key, column] of Object.entries(map)) {
      const value = (t as Row)[key]
      if (value !== undefined) row[column] = value
    }
    return row
  }

  private static toPhoto(r: Row): Photo {
    return {
      id: r.id,
      albumId: r.album_id,
      url: r.url,
      lqip: r.lqip,
      caption: r.caption ?? undefined,
      width: r.width,
      height: r.height,
      sortOrder: r.sort_order,
    }
  }

  // ── Orgs & operators ────────────────────────────────────────────────────────
  async getOrg(id: string): Promise<Org | null> {
    const { data } = await this.db.from('orgs').select('*').eq('id', id).maybeSingle()
    return data ? SupabaseRepository.toOrg(data) : null
  }

  async getOrgBySlug(slug: string): Promise<Org | null> {
    const { data } = await this.db.from('orgs').select('*').eq('slug', slug).maybeSingle()
    return data ? SupabaseRepository.toOrg(data) : null
  }

  async createOrg(org: Org): Promise<Org> {
    const { data, error } = await this.db
      .from('orgs')
      .insert({ id: org.id, name: org.name, slug: org.slug, kind: org.kind, branding: org.branding })
      .select()
      .single()
    // The unique index on slug is what settles two businesses registering the same name at
    // once; checking first and inserting second would just narrow the window.
    if (error?.code === '23505') {
      throw new ApiError('VALIDATION_FAILED', 'That address is taken', {
        fields: { slug: 'Another business is already using this address' },
      })
    }
    if (error) throw new ApiError('INTERNAL', error.message)
    return SupabaseRepository.toOrg(data)
  }

  async listOrgs(kind?: Org['kind']): Promise<Org[]> {
    let query = this.db.from('orgs').select('*').order('created_at', { ascending: false })
    if (kind) query = query.eq('kind', kind)
    const { data, error } = await query
    if (error) throw new ApiError('INTERNAL', error.message)
    return (data ?? []).map(SupabaseRepository.toOrg)
  }

  async createOperator(operator: Operator): Promise<Operator> {
    const { data, error } = await this.db
      .from('operators')
      .insert({
        id: operator.id,
        org_id: operator.orgId,
        email: operator.email,
        name: operator.name,
        role: operator.role,
        // Null under Supabase Auth: the credential lives there, and this column exists only for
        // the self-hosted path.
        password_hash: operator.passwordHash || null,
      })
      .select()
      .single()
    if (error?.code === '23505') {
      throw new ApiError('VALIDATION_FAILED', 'That email is already registered', {
        fields: { email: 'This address already has an account' },
      })
    }
    if (error) throw new ApiError('INTERNAL', error.message)
    return SupabaseRepository.toOperator(data)
  }

  // ── Transfers ───────────────────────────────────────────────────────────────
  private static toTransfer(r: Row): Transfer {
    return {
      id: r.id,
      catalogueId: r.catalogue_id,
      fromOrgId: r.from_org_id,
      toEmail: r.to_email,
      tokenHash: r.token_hash,
      expiresAt: r.expires_at,
      claimedAt: r.claimed_at,
      claimedOrgId: r.claimed_org_id,
      createdAt: r.created_at,
    }
  }

  async createTransfer(transfer: Transfer): Promise<Transfer> {
    const { data, error } = await this.db
      .from('transfers')
      .insert({
        id: transfer.id,
        catalogue_id: transfer.catalogueId,
        from_org_id: transfer.fromOrgId,
        to_email: transfer.toEmail,
        token_hash: transfer.tokenHash,
        expires_at: transfer.expiresAt,
      })
      .select()
      .single()
    // The partial unique index is what enforces one live handover per catalogue.
    if (error?.code === '23505') {
      throw new ApiError('VALIDATION_FAILED', 'A handover is already in progress for this catalogue')
    }
    if (error) throw new ApiError('INTERNAL', error.message)
    return SupabaseRepository.toTransfer(data)
  }

  async getTransferByTokenHash(hash: string): Promise<Transfer | null> {
    const { data } = await this.db.from('transfers').select('*').eq('token_hash', hash).maybeSingle()
    return data ? SupabaseRepository.toTransfer(data) : null
  }

  async getLiveTransferForCatalogue(catalogueId: string): Promise<Transfer | null> {
    const { data } = await this.db
      .from('transfers')
      .select('*')
      .eq('catalogue_id', catalogueId)
      .is('claimed_at', null)
      .maybeSingle()
    return data ? SupabaseRepository.toTransfer(data) : null
  }

  async markTransferClaimed(id: string, claimedOrgId: string): Promise<void> {
    const { error } = await this.db
      .from('transfers')
      .update({ claimed_at: new Date().toISOString(), claimed_org_id: claimedOrgId })
      .eq('id', id)
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async cancelTransfer(id: string): Promise<void> {
    const { error } = await this.db.from('transfers').delete().eq('id', id)
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async deleteOrg(id: string): Promise<void> {
    const { error } = await this.db.from('orgs').delete().eq('id', id)
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async getOperatorByEmail(email: string): Promise<Operator | null> {
    const { data } = await this.db
      .from('operators')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle()
    return data ? SupabaseRepository.toOperator(data) : null
  }

  async getOperator(id: string): Promise<Operator | null> {
    const { data } = await this.db.from('operators').select('*').eq('id', id).maybeSingle()
    return data ? SupabaseRepository.toOperator(data) : null
  }

  // ── Catalogues ──────────────────────────────────────────────────────────────
  async listCatalogues({ orgId }: CatalogueFilter): Promise<Catalogue[]> {
    const { data, error } = await this.db
      .from('catalogues')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw new ApiError('INTERNAL', error.message)
    return (data ?? []).map(SupabaseRepository.toCatalogue)
  }

  async getCatalogue(id: string, orgId: string): Promise<Catalogue | null> {
    const { data } = await this.db
      .from('catalogues')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    return data ? SupabaseRepository.toCatalogue(data) : null
  }

  async getCatalogueById(id: string): Promise<Catalogue | null> {
    const { data } = await this.db.from('catalogues').select('*').eq('id', id).maybeSingle()
    return data ? SupabaseRepository.toCatalogue(data) : null
  }

  async getCatalogueBySlug(slug: string): Promise<Catalogue | null> {
    const { data } = await this.db.from('catalogues').select('*').eq('slug', slug).maybeSingle()
    return data ? SupabaseRepository.toCatalogue(data) : null
  }

  async getCatalogueByCustomDomain(host: string): Promise<Catalogue | null> {
    const { data } = await this.db
      .from('catalogues')
      .select('*')
      .eq('custom_domain', host)
      .maybeSingle()
    return data ? SupabaseRepository.toCatalogue(data) : null
  }

  async slugAvailable(slug: string): Promise<boolean> {
    const { count } = await this.db
      .from('catalogues')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    return (count ?? 0) === 0
  }

  async createCatalogue(catalogue: Catalogue): Promise<Catalogue> {
    const result = await this.db
      .from('catalogues')
      .insert(SupabaseRepository.fromCatalogue(catalogue))
      .select()
      .single()
    if (result.error?.code === '23505') {
      throw new ApiError('VALIDATION_FAILED', 'That address is taken', {
        fields: { slug: 'That address is already in use' },
      })
    }
    return SupabaseRepository.toCatalogue(SupabaseRepository.unwrap(result))
  }

  async updateCatalogue(
    id: string,
    orgId: string,
    patch: Partial<Omit<Catalogue, 'id' | 'orgId'>>,
  ): Promise<Catalogue> {
    const result = await this.db
      .from('catalogues')
      .update(SupabaseRepository.fromCatalogue(patch))
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()
    return SupabaseRepository.toCatalogue(SupabaseRepository.unwrap(result))
  }

  // ── Titles ──────────────────────────────────────────────────────────────────
  async listTitles(catalogueId: string, options?: { publishedOnly?: boolean }): Promise<Title[]> {
    let query = this.db.from('titles').select('*').eq('catalogue_id', catalogueId)
    if (options?.publishedOnly) query = query.eq('published', true).eq('status', 'ready')
    const { data, error } = await query.order('sort_order', { ascending: true })
    if (error) throw new ApiError('INTERNAL', error.message)
    return (data ?? []).map(SupabaseRepository.toTitle)
  }

  async getTitle(id: string): Promise<Title | null> {
    const { data } = await this.db.from('titles').select('*').eq('id', id).maybeSingle()
    return data ? SupabaseRepository.toTitle(data) : null
  }

  async getTitleBySlug(catalogueId: string, slug: string): Promise<Title | null> {
    const { data } = await this.db
      .from('titles')
      .select('*')
      .eq('catalogue_id', catalogueId)
      .eq('slug', slug)
      .maybeSingle()
    return data ? SupabaseRepository.toTitle(data) : null
  }

  async getTitleByProviderId(providerId: string): Promise<Title | null> {
    const { data } = await this.db
      .from('titles')
      .select('*')
      .eq('provider_id', providerId)
      .maybeSingle()
    return data ? SupabaseRepository.toTitle(data) : null
  }

  async createTitle(input: CreateTitleInput): Promise<Title> {
    const result = await this.db
      .from('titles')
      .insert(SupabaseRepository.fromTitle(input as Partial<Title>))
      .select()
      .single()
    return SupabaseRepository.toTitle(SupabaseRepository.unwrap(result))
  }

  async updateTitle(id: string, patch: Partial<Omit<Title, 'id' | 'catalogueId'>>): Promise<Title> {
    const result = await this.db
      .from('titles')
      .update(SupabaseRepository.fromTitle(patch))
      .eq('id', id)
      .select()
      .single()
    return SupabaseRepository.toTitle(SupabaseRepository.unwrap(result))
  }

  async deleteTitle(id: string): Promise<void> {
    const { error } = await this.db.from('titles').delete().eq('id', id)
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async reorderTitles(
    catalogueId: string,
    order: { id: string; sortOrder: number }[],
  ): Promise<void> {
    // One statement, one transaction — a half-applied reorder is visible to guests.
    const { error } = await this.db.rpc('reorder_titles', {
      p_catalogue_id: catalogueId,
      p_order: order.map((o) => ({ id: o.id, sort_order: o.sortOrder })),
    })
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  // ── Albums & photos ─────────────────────────────────────────────────────────
  async listAlbums(catalogueId: string): Promise<Album[]> {
    const { data } = await this.db.from('albums').select('*').eq('catalogue_id', catalogueId)
    return (data ?? []).map((r: Row) => ({
      id: r.id,
      catalogueId: r.catalogue_id,
      name: r.name,
      createdAt: r.created_at,
    }))
  }

  async listPhotos(albumId: string): Promise<Photo[]> {
    const { data } = await this.db
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .order('sort_order')
    return (data ?? []).map(SupabaseRepository.toPhoto)
  }

  async listPhotosForCatalogue(catalogueId: string): Promise<Photo[]> {
    const { data } = await this.db
      .from('photos')
      .select('*, albums!inner(catalogue_id)')
      .eq('albums.catalogue_id', catalogueId)
      .order('sort_order')
    return (data ?? []).map(SupabaseRepository.toPhoto)
  }

  async transferCatalogue(id: string, fromOrgId: string, toOrgId: string): Promise<Catalogue> {
    // `eq('org_id', fromOrgId)` is the safety: this can only move the catalogue the caller
    // already owned, however it was reached.
    const { data, error } = await this.db
      .from('catalogues')
      .update({ org_id: toOrgId })
      .eq('id', id)
      .eq('org_id', fromOrgId)
      .select()
      .single()
    if (error) throw new ApiError('NOT_FOUND', 'Catalogue not found')
    return SupabaseRepository.toCatalogue(data)
  }

  async deleteCatalogue(id: string, orgId: string): Promise<void> {
    // Scoped by org in the statement itself: a delete that trusts a caller to have checked is
    // one refactor away from removing another operator's wedding.
    const { error } = await this.db.from('catalogues').delete().eq('id', id).eq('org_id', orgId)
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async getAlbum(id: string): Promise<Album | null> {
    const { data } = await this.db.from('albums').select('*').eq('id', id).maybeSingle()
    return data ? { id: data.id, catalogueId: data.catalogue_id, name: data.name, createdAt: data.created_at } : null
  }

  async createAlbum(album: Album): Promise<Album> {
    const result = await this.db
      .from('albums')
      .insert({ id: album.id, catalogue_id: album.catalogueId, name: album.name })
      .select()
      .single()
    const r = SupabaseRepository.unwrap(result)
    return { id: r.id, catalogueId: r.catalogue_id, name: r.name, createdAt: r.created_at }
  }

  async createPhoto(photo: Photo): Promise<Photo> {
    const result = await this.db
      .from('photos')
      .insert({
        id: photo.id,
        album_id: photo.albumId,
        url: photo.url,
        lqip: photo.lqip,
        caption: photo.caption,
        width: photo.width,
        height: photo.height,
        sort_order: photo.sortOrder,
      })
      .select()
      .single()
    return SupabaseRepository.toPhoto(SupabaseRepository.unwrap(result))
  }

  // ── Guests ──────────────────────────────────────────────────────────────────

  async getPhoto(id: string): Promise<Photo | null> {
    const { data } = await this.db.from('photos').select('*').eq('id', id).maybeSingle()
    return data ? SupabaseRepository.toPhoto(data) : null
  }

  async deletePhoto(id: string): Promise<void> {
    await this.db.from('photos').delete().eq('id', id)
  }
  async createProfile(profile: Profile): Promise<Profile> {
    const result = await this.db
      .from('profiles')
      .insert({
        id: profile.id,
        catalogue_id: profile.catalogueId,
        label: profile.label,
        avatar_seed: profile.avatarSeed,
      })
      .select()
      .single()
    const r = SupabaseRepository.unwrap(result)
    return {
      id: r.id,
      catalogueId: r.catalogue_id,
      label: r.label,
      avatarSeed: r.avatar_seed,
      createdAt: r.created_at,
    }
  }

  async getProfile(id: string): Promise<Profile | null> {
    const { data } = await this.db.from('profiles').select('*').eq('id', id).maybeSingle()
    if (!data) return null
    return {
      id: data.id,
      catalogueId: data.catalogue_id,
      label: data.label,
      avatarSeed: data.avatar_seed,
      createdAt: data.created_at,
    }
  }

  async upsertProgress(progress: PlaybackProgress): Promise<void> {
    const { error } = await this.db.from('playback_progress').upsert(
      {
        profile_id: progress.profileId,
        title_id: progress.titleId,
        position_s: progress.positionS,
        duration_s: progress.durationS,
        completed: progress.completed,
        updated_at: progress.updatedAt,
      },
      { onConflict: 'profile_id,title_id' },
    )
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async getProgress(profileId: string, titleId: string): Promise<PlaybackProgress | null> {
    const { data } = await this.db
      .from('playback_progress')
      .select('*')
      .eq('profile_id', profileId)
      .eq('title_id', titleId)
      .maybeSingle()
    if (!data) return null
    return {
      profileId: data.profile_id,
      titleId: data.title_id,
      positionS: data.position_s,
      durationS: data.duration_s,
      completed: data.completed,
      updatedAt: data.updated_at,
    }
  }

  async listProgress(profileId: string): Promise<PlaybackProgress[]> {
    const { data } = await this.db
      .from('playback_progress')
      .select('*')
      .eq('profile_id', profileId)
    return (data ?? []).map((r: Row) => ({
      profileId: r.profile_id,
      titleId: r.title_id,
      positionS: r.position_s,
      durationS: r.duration_s,
      completed: r.completed,
      updatedAt: r.updated_at,
    }))
  }

  async upsertModuleState(state: ModuleState): Promise<void> {
    const { error } = await this.db.from('module_state').upsert(
      {
        profile_id: state.profileId,
        module_id: state.moduleId,
        state: state.state,
        updated_at: state.updatedAt,
      },
      { onConflict: 'profile_id,module_id' },
    )
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async getModuleState(profileId: string, moduleId: string): Promise<ModuleState | null> {
    const { data } = await this.db
      .from('module_state')
      .select('*')
      .eq('profile_id', profileId)
      .eq('module_id', moduleId)
      .maybeSingle()
    if (!data) return null
    return {
      profileId: data.profile_id,
      moduleId: data.module_id,
      state: data.state,
      updatedAt: data.updated_at,
    }
  }

  // ── Ops ─────────────────────────────────────────────────────────────────────
  async recordPlayEvent(event: {
    catalogueId: string
    titleId: string
    profileId: string | null
    seconds: number
  }): Promise<void> {
    const { error } = await this.db.rpc('record_play_event', {
      p_catalogue_id: event.catalogueId,
      p_title_id: event.titleId,
      p_profile_id: event.profileId,
      p_seconds: event.seconds,
    })
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async listAllCatalogues(): Promise<Catalogue[]> {
    const { data, error } = await this.db.from('catalogues').select('*')
    if (error) throw new ApiError('INTERNAL', error.message)
    return (data ?? []).map(SupabaseRepository.toCatalogue)
  }

  async upsertUsage(usage: {
    catalogueId: string
    month: string
    storedGb: number
    deliveredGb: number
  }): Promise<void> {
    const { error } = await this.db.from('usage_rollup').upsert(
      {
        catalogue_id: usage.catalogueId,
        month: usage.month,
        stored_gb: usage.storedGb,
        delivered_gb: usage.deliveredGb,
      },
      { onConflict: 'catalogue_id,month' },
    )
    if (error) throw new ApiError('INTERNAL', error.message)
  }

  async listUsage(catalogueId: string) {
    const { data } = await this.db
      .from('usage_rollup')
      .select('*')
      .eq('catalogue_id', catalogueId)
      .order('month', { ascending: false })
    return (data ?? []).map((r: Row) => ({
      catalogueId: r.catalogue_id,
      month: r.month,
      storedGb: Number(r.stored_gb),
      deliveredGb: Number(r.delivered_gb),
    }))
  }

  async listStalledTitles(olderThanMinutes: number): Promise<Title[]> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString()
    const { data } = await this.db
      .from('titles')
      .select('*')
      // `uploading` belongs here as much as `processing` does. A title is created `uploading`
      // and it is the webhook that moves it on, so a lost webhook strands it in `uploading` —
      // the exact failure this job exists to catch, and the one it used to be blind to.
      .in('status', ['uploading', 'processing'])
      .lt('created_at', cutoff)
    return (data ?? []).map(SupabaseRepository.toTitle)
  }
}
