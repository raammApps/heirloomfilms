import { defineModule } from '../contract'
import Editor from './Editor'
import Guest from './Guest'
import { configSchema, type LetterConfig } from './schema'

export default defineModule<LetterConfig>({
  meta: {
    type: 'letter',
    label: 'A message',
    description: 'A long-form personal note, set as type. No video, and often the best screen.',
    icon: 'PenLine',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 0,
  },

  schema: configSchema,

  Guest,
  Editor,

  defaults: () => ({ body: { en: '' }, signature: { en: '' }, theme: 'plain' }),

  advise: (config) => {
    const words = config.body.en.trim().split(/\s+/).filter(Boolean).length
    if (words === 0) return ['This message is empty, so guests will not see it at all.']
    if (words < 25) return ['A very short message reads as a caption. Two or three paragraphs land better.']
    return []
  },
})
