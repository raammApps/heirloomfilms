import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { z } from 'zod'
import { requireOwnedCatalogue } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { ApiError } from '@/lib/http/errors'
import { noStore, readJson, route } from '@/lib/http/handler'
import { log } from '@/lib/log'
import { transferSchema } from '@/lib/schema'
import { adminUrl } from '@/lib/tenant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Hand a catalogue to the couple who own it (doc 15 §2).
 *
 * **Returns a link rather than sending an email.** Partner and couple are already talking —
 * usually on WhatsApp, which is where a wedding is actually organised in this market — and a
 * link the partner forwards themselves arrives, whereas an automated email lands in spam or
 * waits on SMTP nobody configured. It also means the partner can see exactly what they are
 * sending before they send it.
 *
 * The token is the credential. Whoever holds the link can claim the wedding, so it is single
 * use, expiring, and stored only as a hash — a leaked database must not confer a claim on every
 * handover in flight.
 */

const DAYS = 14
const bodySchema = z.object({ email: z.string().email() })

/** The token is a bearer credential; only its hash is ever written down. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/catalogue:transfer', async () => {
    const { id } = await params
    const { session, catalogue } = await requireOwnedCatalogue(id)
    const body = await readJson(request, bodySchema)

    const repository = getRepository()

    // One live handover per catalogue. Two outstanding links is a way to give a wedding to the
    // wrong household, so superseding is explicit: cancel, then issue again.
    const existing = await repository.getLiveTransferForCatalogue(id)
    if (existing) {
      throw new ApiError(
        'VALIDATION_FAILED',
        'A handover is already waiting to be accepted. Cancel it first to send a new link.',
      )
    }

    const token = randomBytes(32).toString('base64url')
    const transfer = transferSchema.parse({
      id: randomUUID(),
      catalogueId: catalogue.id,
      fromOrgId: session.orgId,
      toEmail: body.email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + DAYS * 864e5).toISOString(),
      createdAt: new Date().toISOString(),
    })
    await repository.createTransfer(transfer)

    log.info('transfer issued', { catalogueId: catalogue.id, transferId: transfer.id })

    // The only time the plaintext token exists outside the link. It is not stored, and this
    // response is the partner's single chance to copy it.
    const base = adminUrl(env.ROOT_DOMAIN, env.TENANCY_MODE).replace(/\/admin$/, '')
    return noStore({
      transfer: { id: transfer.id, toEmail: transfer.toEmail, expiresAt: transfer.expiresAt },
      claimUrl: `${base}/claim/${token}`,
    })
  })
}

/** Cancel a handover the couple has not accepted. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/catalogue:transfer:cancel', async () => {
    const { id } = await params
    await requireOwnedCatalogue(id)

    const repository = getRepository()
    const existing = await repository.getLiveTransferForCatalogue(id)
    if (!existing) throw new ApiError('NOT_FOUND', 'No handover is waiting')

    // Deleting the row invalidates the link: the claim route looks the token up by hash, and
    // there is nothing left to find.
    await repository.cancelTransfer(existing.id)
    log.info('transfer cancelled', { catalogueId: id, transferId: existing.id })
    return noStore({ cancelled: existing.id })
  })
}
