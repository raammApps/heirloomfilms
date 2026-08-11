import { requireOwnedCatalogue } from '@/lib/admin/session'
import { revalidateCatalogue } from '@/lib/catalogue-cache'
import { getRepository } from '@/lib/db'
import { ApiError } from '@/lib/http/errors'
import { noStore, route } from '@/lib/http/handler'
import { getPhotoProvider } from '@/lib/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/photo:delete', async () => {
    const { id } = await params

    const repository = getRepository()
    const photo = await repository.getPhoto(id)
    if (!photo) throw new ApiError('NOT_FOUND', 'Photograph not found')

    // Ownership runs through the album's catalogue — never from anything the request supplied.
    const album = await repository.getAlbum(photo.albumId)
    if (!album) throw new ApiError('NOT_FOUND', 'Photograph not found')
    const { catalogue } = await requireOwnedCatalogue(album.catalogueId)

    // Row first, file second. The reverse can leave a row pointing at nothing, which renders a
    // broken image on a wedding page; a file with no row is invisible and costs a fraction of a
    // penny until the storage zone is swept.
    await repository.deletePhoto(id)
    await getPhotoProvider().remove(photoKeyFromUrl(photo.url))

    revalidateCatalogue(catalogue.slug)
    return noStore({ deleted: id })
  })
}

/**
 * Recover the storage key from the stored public URL.
 *
 * `photos.url` is the durable public URL rather than a key, because that is what the guest page
 * renders. Deletion is the only caller that needs the key back, so it is derived here rather
 * than adding a column that would have to be kept in step.
 */
function photoKeyFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, '')
  } catch {
    return url.replace(/^\//, '')
  }
}
