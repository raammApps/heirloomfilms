import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PosterCard, type RowItem } from '@/components/streaming/PosterCard'

/**
 * A moving preview is welcome only when it was actually asked for.
 *
 * The interesting behaviour is all refusal: sweeping a cursor across a row must fetch nothing,
 * a phone must never preview at all — "hover" there fires on the tap that is already opening
 * the film — and someone on a metered plan or with reduced motion must be left alone.
 */

const item: RowItem = {
  id: 'title-1',
  key: 'the-ceremony',
  label: 'The Ceremony',
  posterUrl: '/api/poster/title-1',
  previewUrl: '/api/poster/title-1?file=preview.webp',
}

function environment({ reduced = false, fine = true, saveData = false } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : query.includes('hover') ? fine : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  Object.defineProperty(navigator, 'connection', { value: { saveData }, configurable: true })
}

const previewImage = () => document.querySelector('img[aria-hidden="true"]')

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('<PosterCard> preview', () => {
  it('waits before loading, so crossing a row costs nothing', async () => {
    environment()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<PosterCard item={item} aspect="2:3" onOpen={vi.fn()} />)

    await user.hover(screen.getByTestId('poster-card'))
    expect(previewImage()).toBeNull()

    act(() => void vi.advanceTimersByTime(600))
    await waitFor(() => expect(previewImage()).not.toBeNull())
  })

  it('drops it again when the pointer leaves before the delay', async () => {
    environment()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<PosterCard item={item} aspect="2:3" onOpen={vi.fn()} />)

    const card = screen.getByTestId('poster-card')
    await user.hover(card)
    await user.unhover(card)
    act(() => void vi.advanceTimersByTime(1000))
    expect(previewImage()).toBeNull()
  })

  it('never previews on a touch screen', async () => {
    // `hover` fires on the tap that is already opening the film.
    environment({ fine: false })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<PosterCard item={item} aspect="2:3" onOpen={vi.fn()} />)

    await user.hover(screen.getByTestId('poster-card'))
    act(() => void vi.advanceTimersByTime(1000))
    expect(previewImage()).toBeNull()
  })

  it('respects reduced motion', async () => {
    environment({ reduced: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<PosterCard item={item} aspect="2:3" onOpen={vi.fn()} />)

    await user.hover(screen.getByTestId('poster-card'))
    act(() => void vi.advanceTimersByTime(1000))
    expect(previewImage()).toBeNull()
  })

  it('respects Save-Data, which is the default case on a metered plan', async () => {
    environment({ saveData: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<PosterCard item={item} aspect="2:3" onOpen={vi.fn()} />)

    await user.hover(screen.getByTestId('poster-card'))
    act(() => void vi.advanceTimersByTime(1000))
    expect(previewImage()).toBeNull()
  })

  it('shows nothing for a card with no preview, such as a photograph', async () => {
    environment()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<PosterCard item={{ ...item, previewUrl: null }} aspect="4:3" onOpen={vi.fn()} />)

    await user.hover(screen.getByTestId('poster-card'))
    act(() => void vi.advanceTimersByTime(1000))
    expect(previewImage()).toBeNull()
  })
})
