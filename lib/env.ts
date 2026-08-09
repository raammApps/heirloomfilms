import 'server-only'
import { z } from 'zod'

/**
 * The one place `process.env` is read (enforced by an eslint rule).
 *
 * `server-only` is load-bearing: this module names every secret the app has, and it was once
 * pulled into the browser bundle through a transitive `lib/log` import. The guard turns that
 * class of mistake into a build error rather than a white screen in front of a guest.
 *
 * Configuration is validated once, at module load, so a missing Bunny key fails the boot of a
 * deployment rather than the first playback request of a wedding reception.
 */

const nonEmpty = z.string().trim().min(1)

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    /**
     * Set by Next during `next build`. The production guards below are runtime guards; the
     * build runs with NODE_ENV=production and no real configuration, and must not trip them.
     */
    NEXT_PHASE: z.string().optional(),

    /**
     * Opt in to running a production build on an ephemeral store. Exists for the Playwright
     * suite and for an offline planner demo — never for a real deployment, which is why it has
     * to be typed out rather than inferred.
     */
    ALLOW_EPHEMERAL_DATA: z.enum(['0', '1']).default('0'),

    ROOT_DOMAIN: nonEmpty.default('mehfil.localhost:3000'),

    DATA_DRIVER: z.enum(['memory', 'file', 'supabase']).default('memory'),
    DATA_DIR: nonEmpty.default('.data'),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),

    /**
     * Supabase renamed its keys: `anon` → publishable (`sb_publishable_…`) and `service_role`
     * → secret (`sb_secret_…`). New projects only show the new names, older ones the old, so
     * both spellings are accepted and normalised below rather than making the operator
     * translate between a dashboard and a doc.
     */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_SECRET_KEY: z.string().optional(),

    VIDEO_DRIVER: z.enum(['fake', 'bunny']).default('fake'),
    BUNNY_LIBRARY_ID: z.string().optional(),
    BUNNY_API_KEY: z.string().optional(),
    BUNNY_CDN_HOSTNAME: z.string().optional(),
    BUNNY_TOKEN_AUTH_KEY: z.string().optional(),
    BUNNY_WEBHOOK_SECRET: z.string().optional(),

    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

    DEV_OPERATOR_EMAIL: z.string().email().default('operator@mehfil.test'),
    DEV_OPERATOR_PASSWORD: nonEmpty.default('mehfil-dev'),

    PLAYBACK_TOKEN_TTL_S: z.coerce.number().int().positive().default(4 * 60 * 60),

    /** Set by Vercel; surfaced on /api/health so a deploy can be identified. */
    VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  })
  .transform((env) => ({
    ...env,
    // One canonical name downstream, whichever spelling the dashboard offered.
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
  }))
  .superRefine((env, ctx) => {
    if (env.DATA_DRIVER === 'supabase') {
      for (const key of [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message:
              key === 'SUPABASE_SERVICE_ROLE_KEY'
                ? 'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY, sb_secret_…) is required when DATA_DRIVER=supabase'
                : `${key} is required when DATA_DRIVER=supabase`,
          })
        }
      }
    }

    if (env.VIDEO_DRIVER === 'bunny') {
      for (const key of [
        'BUNNY_LIBRARY_ID',
        'BUNNY_API_KEY',
        'BUNNY_CDN_HOSTNAME',
        'BUNNY_TOKEN_AUTH_KEY',
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when VIDEO_DRIVER=bunny`,
          })
        }
      }
    }

    const building = env.NEXT_PHASE?.includes('build') ?? false

    if (env.NODE_ENV === 'production' && !building) {
      if (env.SESSION_SECRET.startsWith('dev-only')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'The example SESSION_SECRET must not be used in production',
        })
      }
      if (env.DATA_DRIVER !== 'supabase' && env.ALLOW_EPHEMERAL_DATA !== '1') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATA_DRIVER'],
          message: 'Production must run on the supabase driver; memory/file lose data on restart',
        })
      }
    }
  })

export type Env = z.infer<typeof schema>

function load(): Env {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${detail}`)
  }
  return parsed.data
}

export const env: Env = load()

/** Root domain without a port — what a Host header is compared against. */
export const rootDomainHost: string = env.ROOT_DOMAIN.split(':')[0]!.toLowerCase()

export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
