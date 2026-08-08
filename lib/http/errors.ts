import { NextResponse } from 'next/server'

/**
 * The error vocabulary from doc 07. Clients localise by `code`; `message` is for operators and
 * logs and is never rendered to a guest.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 400,
  PASSCODE_REQUIRED: 401,
  UNAUTHORIZED: 401,
  SUBSCRIPTION_INACTIVE: 402,
  FORBIDDEN: 403,
  CATALOGUE_NOT_FOUND: 404,
  NOT_FOUND: 404,
  TITLE_NOT_READY: 409,
  UPLOAD_LIMIT: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly fields?: FieldErrors
  readonly retryAfterS?: number

  constructor(
    code: ErrorCode,
    message: string,
    options?: { fields?: FieldErrors; retryAfterS?: number },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.fields = options?.fields
    this.retryAfterS = options?.retryAfterS
  }

  get status(): number {
    return ERROR_CODES[this.code]
  }
}

export function errorResponse(error: ApiError): NextResponse {
  const headers = new Headers({ 'cache-control': 'no-store' })
  if (error.retryAfterS !== undefined) headers.set('retry-after', String(error.retryAfterS))

  return NextResponse.json(
    {
      error: {
        code: error.code,
        // Never leak internals: 500s carry a fixed string regardless of the thrown message.
        message: error.code === 'INTERNAL' ? 'Something went wrong' : error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    },
    { status: error.status, headers },
  )
}
