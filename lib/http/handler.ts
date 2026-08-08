import { NextResponse } from 'next/server'
import { z } from 'zod'
import { log } from '@/lib/log'
import { ApiError, errorResponse } from './errors'

/**
 * One wrapper for every route handler, so error shape, logging and the "never leak detail on a
 * 500" rule (doc 07) are implemented once.
 */
export function route<T>(
  name: string,
  handler: () => Promise<NextResponse<T> | Response>,
): Promise<Response> {
  return handler().catch((error: unknown) => {
    if (error instanceof ApiError) return errorResponse(error)

    if (error instanceof z.ZodError) {
      return errorResponse(
        new ApiError('VALIDATION_FAILED', 'Some fields need attention', {
          fields: Object.fromEntries(
            error.issues.map((issue) => [issue.path.join('.') || '_', issue.message]),
          ),
        }),
      )
    }

    // Next's redirect() and notFound() throw control-flow errors that must propagate.
    if (error && typeof error === 'object' && 'digest' in error) throw error

    log.error('unhandled route error', { route: name, reason: (error as Error)?.message })
    return errorResponse(new ApiError('INTERNAL', 'Something went wrong'))
  })
}

/** Parse a JSON body against a schema, converting failures into `VALIDATION_FAILED`. */
export async function readJson<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new ApiError('VALIDATION_FAILED', 'Expected a JSON body')
  }
  return schema.parse(raw)
}

export function noStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
}
