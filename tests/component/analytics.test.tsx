import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatalogueAnalytics } from '@/components/admin/CatalogueAnalytics'
import { titleSchema, type Title } from '@/lib/schema'

/**
 * The numbers an operator is shown must mean what the label says.
 *
 * `viewCount` counts a play only once it passes thirty seconds — never an impression, which
 * doc 06 §3 calls a vanity number — and `watchSeconds` accumulates in the same transaction as
 * the play event. The panel's job is to not quietly undo that honesty.
 */

const CATALOGUE = '33333333-3333-4333-8333-333333333333'

function film(n: number, over: Partial<Title> = {}): Title {
  return titleSchema.parse({
    id: `4444444${n}-4444-4444-8444-444444444444`,
    catalogueId: CATALOGUE,
    slug: `film-${n}`,
    name: { en: `Film ${n}` },
    category: 'highlights',
    status: 'ready',
    published: true,
    durationS: 100,
    createdAt: new Date().toISOString(),
    ...over,
  })
}

describe('<CatalogueAnalytics>', () => {
  it('says nothing at all when there is nothing published', () => {
    const { container } = render(<CatalogueAnalytics titles={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('invites patience rather than showing a wall of zeroes', () => {
    render(<CatalogueAnalytics titles={[film(1)]} />)
    expect(screen.getByText(/Nothing watched yet/)).toBeInTheDocument()
  })

  it('counts only published films, so a draft cannot inflate the total', () => {
    render(
      <CatalogueAnalytics
        titles={[
          film(1, { viewCount: 2, watchSeconds: 100 }),
          film(2, { published: false, viewCount: 99, watchSeconds: 9999 }),
        ]}
      />,
    )
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('Film 2')).not.toBeInTheDocument()
  })

  it('ranks by plays, so the most-watched film reads first', () => {
    render(
      <CatalogueAnalytics
        titles={[
          film(1, { viewCount: 1, watchSeconds: 50 }),
          film(2, { viewCount: 9, watchSeconds: 500 }),
        ]}
      />,
    )
    const names = screen.getAllByTitle(/^Film/).map((n) => n.textContent)
    expect(names[0]).toBe('Film 2')
  })

  it('distinguishes a film people finish from one they abandon', () => {
    render(
      <CatalogueAnalytics
        titles={[
          film(1, { viewCount: 4, watchSeconds: 4 * 95 }),
          film(2, { viewCount: 4, watchSeconds: 4 * 10 }),
        ]}
      />,
    )
    expect(screen.getByText(/watched to the end/)).toBeInTheDocument()
    expect(screen.getByText(/most stop early/)).toBeInTheDocument()
  })
})
