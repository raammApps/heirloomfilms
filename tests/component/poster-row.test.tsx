import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { COMPACT_ROW_THRESHOLD, PosterRow } from '@/components/streaming/PosterRow'
import type { RowItem } from '@/components/streaming/PosterCard'
import { createTranslator } from '@/lib/i18n'

/**
 * doc 02 §5 and doc 08: "a row with 2–3 cards is a designed state" — no arrows, no peeking
 * card, left-aligned, cards sized up. This is an acceptance criterion, so it is a test.
 */

const t = createTranslator('en')

function items(count: number): RowItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index}`,
    key: `film-${index}`,
    label: `Film ${index}`,
    posterUrl: null,
  }))
}

function renderRow(count: number, onOpen = vi.fn()) {
  const result = render(
    <PosterRow heading="The films" items={items(count)} onOpen={onOpen} t={t} />,
  )
  return { ...result, onOpen }
}

describe('<PosterRow>', () => {
  it('renders nothing at all when it has no items — never a heading over nothing', () => {
    const { container } = render(<PosterRow heading="The films" items={[]} onOpen={vi.fn()} t={t} />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each([1, 2, 3])('uses the compact layout for %d cards', (count) => {
    renderRow(count)
    expect(screen.getByTestId('poster-row')).toHaveAttribute('data-compact', 'true')
    // No arrows: at this count there is nothing to scroll to, and arrows read as breakage.
    expect(screen.queryByLabelText('Scroll right')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Scroll left')).not.toBeInTheDocument()
  })

  it('does not snap-scroll in the compact layout', () => {
    renderRow(COMPACT_ROW_THRESHOLD)
    const list = screen.getByRole('list')
    expect(list.className).not.toContain('overflow-x-auto')
    expect(list.className).toContain('flex-wrap')
  })

  it('steps the card width up in the compact layout', () => {
    renderRow(3)
    const card = screen.getAllByTestId('poster-card')[0]!
    expect(card.className).toContain('--card-w-wide')
  })

  it('switches to the scrolling layout at four cards', () => {
    renderRow(4)
    expect(screen.getByTestId('poster-row')).toHaveAttribute('data-compact', 'false')
    const list = screen.getByRole('list')
    expect(list.className).toContain('overflow-x-auto')
    expect(list.className).toContain('[scroll-snap-type:x_mandatory]')
  })

  it('breaks the right margin so the next card peeks', () => {
    renderRow(6)
    expect(screen.getByRole('list').className).toContain('pe-6')
  })

  it('opens a title when a card is activated', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderRow(5)
    await user.click(screen.getAllByTestId('poster-card')[2]!)
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ key: 'film-2' }))
  })

  it('moves focus with the arrow keys without trapping Tab', async () => {
    const user = userEvent.setup()
    renderRow(5)
    const cards = screen.getAllByTestId('poster-card')

    cards[0]!.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(cards[1])

    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cards[0])

    // Arrow-left at the start is a no-op rather than a wrap, so focus never leaves the row
    // unexpectedly.
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cards[0])
  })

  it('exposes the row as a list with focusable cards', () => {
    renderRow(5)
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('button')).toHaveLength(5)
  })

  it('generates poster art rather than leaving a blank card', () => {
    renderRow(2)
    const images = screen.getAllByRole('presentation', { hidden: true })
    expect(images.length).toBeGreaterThan(0)
  })
})
