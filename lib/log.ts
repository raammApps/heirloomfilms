type Level = 'debug' | 'info' | 'warn' | 'error'

type Fields = Record<string, unknown>

/**
 * Structured single-line JSON logging, so Vercel/Datadog can query it.
 *
 * `redact` exists because doc 10 §5 asks every PR "does anything new get written to logs that
 * shouldn't be there". Tokens, passcodes and signatures are stripped centrally rather than
 * relying on every call site to remember.
 */
const SECRET_KEYS = /passcode|password|token|secret|signature|authorization|apikey|api_key/i

export function redact(fields: Fields): Fields {
  const out: Fields = {}
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEYS.test(key)) {
      out[key] = '[redacted]'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redact(value as Fields)
    } else {
      out[key] = value
    }
  }
  return out
}

function emit(level: Level, message: string, fields: Fields = {}): void {
  // Read directly rather than through lib/env: this module is imported by the module
  // registry, which renders on the client, and lib/env is server-only by design.
  if (process.env.NODE_ENV === 'test' && level !== 'error') return
  const line = JSON.stringify({ level, message, at: new Date().toISOString(), ...redact(fields) })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const log = {
  debug: (message: string, fields?: Fields) => emit('debug', message, fields),
  info: (message: string, fields?: Fields) => emit('info', message, fields),
  warn: (message: string, fields?: Fields) => emit('warn', message, fields),
  error: (message: string, fields?: Fields) => emit('error', message, fields),
}
