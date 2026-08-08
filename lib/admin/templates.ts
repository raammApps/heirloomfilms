import type { Album, Catalogue, ModuleInstance, Title } from '@/lib/schema'
import { instantiate } from '@/modules/registry'

/**
 * Templates (doc 14 §5.8).
 *
 * A template is a preset list of module instances the operator starts from and edits. This is
 * what makes the 30-minute target achievable — an operator who has to compose a page from an
 * empty list will take an hour and produce something worse.
 */

export type TemplateId = 'keepsake' | 'films-only' | 'anniversary'

export type Template = {
  id: TemplateId
  label: string
  description: string
  /** Module types in page order, with the heading the operator will most likely keep. */
  sections: { type: string; heading: { en: string; hi?: string } }[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'keepsake',
    label: 'The Keepsake',
    description:
      'Billboard, two film rows, a written message and the photographs. The default, and the shape most weddings want.',
    sections: [
      { type: 'billboard', heading: { en: '' } },
      { type: 'curated_row', heading: { en: 'The films', hi: 'फ़िल्में' } },
      { type: 'letter', heading: { en: 'A message for you', hi: 'आपके लिए एक संदेश' } },
      { type: 'curated_row', heading: { en: 'Short and worth it', hi: 'छोटी और ख़ास' } },
      { type: 'photo_grid', heading: { en: 'The day in photographs', hi: 'तस्वीरों में वह दिन' } },
    ],
  },
  {
    id: 'films-only',
    label: 'Films Only',
    description: 'Billboard and one row. For a delivery that is genuinely just the films.',
    sections: [
      { type: 'billboard', heading: { en: '' } },
      { type: 'curated_row', heading: { en: 'The films', hi: 'फ़िल्में' } },
    ],
  },
  {
    id: 'anniversary',
    label: 'Anniversary',
    description: 'A message first, then the films and the photographs. Quieter, less of an event.',
    sections: [
      { type: 'billboard', heading: { en: '' } },
      { type: 'letter', heading: { en: 'A year on', hi: 'एक साल बाद' } },
      { type: 'curated_row', heading: { en: 'The films', hi: 'फ़िल्में' } },
      { type: 'photo_row', heading: { en: 'That week', hi: 'वह हफ़्ता' } },
    ],
  },
]

export function getTemplate(id: string | null | undefined): Template {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0]!
}

/** Build a template's module instances against real content, so nothing starts empty. */
export function seedModules(
  templateId: string | null | undefined,
  catalogue: Catalogue,
  titles: Title[],
  albums: Album[],
): ModuleInstance[] {
  const template = getTemplate(templateId)
  const rows = template.sections.filter((s) => s.type === 'curated_row').length

  // Split the available films across the template's rows rather than repeating them, so a
  // freshly seeded catalogue does not show the same film in two places.
  const nonFeatured = titles.filter((t) => t.id !== catalogue.featuredTitleId)
  const perRow = Math.max(1, Math.ceil(nonFeatured.length / Math.max(1, rows)))
  let rowIndex = 0

  return template.sections.flatMap((section, order) => {
    const instance = instantiate(section.type, order, catalogue, titles, albums)
    if (!instance) return []

    instance.title = section.heading

    if (section.type === 'curated_row') {
      const slice = nonFeatured.slice(rowIndex * perRow, (rowIndex + 1) * perRow)
      rowIndex += 1
      instance.config = {
        ...instance.config,
        titleIds: slice.map((t) => t.id),
        // Alternate shapes: mixed aspect ratios read as curation, a uniform grid as a template.
        aspect: rowIndex % 2 === 0 ? '16:9' : '2:3',
      }
    }

    return [instance]
  })
}
