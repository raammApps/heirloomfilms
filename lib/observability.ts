import { log } from './log'

/**
 * The reporting seam.
 *
 * Deliberately vendor-neutral. Everything goes to structured stdout, which Vercel, Docker and
 * a plain `node server.js` all capture — so errors are visible today, with no account and
 * nothing added to the browser bundle. Putting Sentry or Axiom behind it later is this file
 * and nothing else: no call site changes.
 *
 * The reason for a seam rather than scattered `console.error` is that an error worth alerting
 * on needs consistent shape — a name, a request id, and the fields someone can search by.
 */

export type Severity = 'warning' | 'error' | 'fatal'

export type ErrorContext = {
  /** Ties a report to the request that produced it. See `requestId()`. */
  requestId?: string
  /** Where it happened: a route name, a job name. */
  scope?: string
  catalogueId?: string
  titleId?: string
  [key: string]: unknown
}

/** Swappable sink. A vendor integration replaces this and touches nothing else. */
export type ErrorSink = (input: {
  severity: Severity
  message: string
  stack?: string
  context: ErrorContext
}) => void

let sink: ErrorSink = ({ severity, message, stack, context }) => {
  // `error.report` is the string to alert on; everything else is searchable context.
  log[severity === 'warning' ? 'warn' : 'error']('error.report', {
    severity,
    reason: message,
    // Trimmed: a full stack per line makes log search unusable, and the top frames are the
    // ones that identify the fault.
    stack: stack?.split('\n').slice(0, 6).join(' | '),
    ...context,
  })
}

export function setErrorSink(next: ErrorSink): void {
  sink = next
}

/**
 * Report a caught error. Never throws — a failure in reporting must not become the failure the
 * guest sees.
 */
export function reportError(
  error: unknown,
  context: ErrorContext = {},
  severity: Severity = 'error',
): void {
  try {
    const normalised = error instanceof Error ? error : new Error(String(error))
    sink({
      severity,
      message: normalised.message,
      stack: normalised.stack,
      context,
    })
  } catch {
    /* reporting is best-effort by definition */
  }
}

/**
 * A correlation id for one request.
 *
 * Prefers the platform's own header so a log line here can be lined up with the platform's
 * record of the same request; falls back to a random one so every request has one either way.
 */
export function requestId(request: Request): string {
  return (
    request.headers.get('x-vercel-id') ??
    request.headers.get('x-request-id') ??
    Math.random().toString(36).slice(2, 12)
  )
}
