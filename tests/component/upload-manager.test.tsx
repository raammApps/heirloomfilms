import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UploadManager } from '@/components/admin/UploadManager'

/**
 * A dropped connection must not end an upload.
 *
 * Verified against real Bunny by `pnpm verify:upload`, which is the authority — but that costs
 * bandwidth and a live account, so these pin the behaviour cheaply and in CI. They exist
 * because the first live run failed: tus reported the drop, the row said "Failed", and nothing
 * ever picked it back up. Six gigabytes of a wedding, ended by a wifi blip.
 */

const startSpy = vi.fn()
const abortSpy = vi.fn()
const findPreviousSpy = vi.fn(async () => [] as unknown[])
const resumeFromSpy = vi.fn()

/** Captures the options the component hands tus, so the retry policy itself is assertable. */
let capturedOptions: Record<string, unknown> = {}
let triggerError: ((error: Error) => void) | null = null

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

vi.mock('tus-js-client', () => ({
  Upload: class {
    constructor(_file: unknown, options: Record<string, unknown>) {
      capturedOptions = options
      triggerError = options.onError as (error: Error) => void
    }
    start = startSpy
    abort = abortSpy
    findPreviousUploads = findPreviousSpy
    resumeFromPreviousUpload = resumeFromSpy
  },
}))

function videoFile(name = 'ceremony.mp4'): File {
  return new File([new Uint8Array(1024)], name, { type: 'video/mp4' })
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        titleId: 'title-1',
        tusEndpoint: 'https://video.bunnycdn.com/tusupload',
        headers: { VideoId: 'v1' },
        chunkSizeBytes: 5 * 1024 * 1024,
      }),
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  triggerError = null
})

async function startUpload() {
  render(<UploadManager catalogueId="cat-1" />)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const { default: userEvent } = await import('@testing-library/user-event')
  await userEvent.upload(input, videoFile())
  await waitFor(() => expect(startSpy).toHaveBeenCalled())
}

describe('<UploadManager> when the network drops', () => {
  it('treats a bare network failure as retryable', async () => {
    await startUpload()

    const shouldRetry = capturedOptions.onShouldRetry as (
      error: unknown,
      attempt: number,
      options: { retryDelays?: number[] },
    ) => boolean
    const delays = capturedOptions.retryDelays as number[]

    // No response at all is what a dropped connection looks like, and it is the whole reason
    // this mechanism exists — the default policy gives up on it.
    expect(shouldRetry(new Error('network'), 0, { retryDelays: delays })).toBe(true)
  })

  it('does not retry a 4xx, which will not fix itself', async () => {
    await startUpload()
    const shouldRetry = capturedOptions.onShouldRetry as (
      error: unknown,
      attempt: number,
      options: { retryDelays?: number[] },
    ) => boolean

    const forbidden = Object.assign(new Error('forbidden'), {
      originalResponse: { getStatus: () => 403 },
    })
    expect(shouldRetry(forbidden, 0, { retryDelays: [0, 1] })).toBe(false)

    // 409 and 423 are tus offset conflicts and do resolve on a retry.
    const conflict = Object.assign(new Error('conflict'), {
      originalResponse: { getStatus: () => 409 },
    })
    expect(shouldRetry(conflict, 0, { retryDelays: [0, 1] })).toBe(true)
  })

  it('shows an interrupted upload as waiting, not as failed', async () => {
    await startUpload()

    act(() =>
      triggerError!(
        new Error(
          'tus: failed to upload chunk at offset 5242880, caused by [object ProgressEvent]',
        ),
      ),
    )

    // "Failed" reads as over. It is not over: the bytes are still at the provider.
    await waitFor(() => expect(screen.getByText(/Waiting for the network/)).toBeInTheDocument())
    expect(screen.queryByText(/^Failed$/)).not.toBeInTheDocument()

    // And the operator is told what will happen, not handed tus internals.
    expect(screen.getByText(/pick up where it left off/i)).toBeInTheDocument()
    expect(screen.queryByText(/ProgressEvent/)).not.toBeInTheDocument()
  })

  it('resumes from the provider offset when the network comes back', async () => {
    await startUpload()
    startSpy.mockClear()
    findPreviousSpy.mockClear()

    act(() =>
      triggerError!(new Error('tus: failed to upload chunk, caused by [object ProgressEvent]')),
    )
    await waitFor(() => expect(screen.getByText(/Waiting for the network/)).toBeInTheDocument())

    // No backoff schedule covers a laptop that slept for an hour, so the network returning is
    // the signal (doc 05 §3).
    act(() => window.dispatchEvent(new Event('online')))

    await waitFor(() => {
      // findPreviousUploads makes tus HEAD the provider for the true offset, rather than
      // trusting whatever the browser believed before it lost connectivity.
      expect(findPreviousSpy).toHaveBeenCalled()
      expect(startSpy).toHaveBeenCalled()
    })
  })

  it('lets the operator resume by hand as well', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    await startUpload()
    startSpy.mockClear()

    act(() => triggerError!(new Error('tus: failed, caused by [object ProgressEvent]')))
    await waitFor(() => expect(screen.getByText(/Waiting for the network/)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Resume/ }))
    await waitFor(() => expect(startSpy).toHaveBeenCalled())
  })
})
