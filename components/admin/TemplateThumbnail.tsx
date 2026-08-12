import { getModule } from '@/modules/registry'

/**
 * A miniature of what a template lays out.
 *
 * Step 2 of the wizard asks an operator to choose the shape of the entire guest page, and it
 * asked with three radio buttons and a sentence of prose. It is the most consequential decision
 * in the flow and it was the least informed one.
 *
 * Drawn rather than rendered: mounting five real guest components at thumbnail size would pull
 * the player and the photo grid into the wizard's bundle to produce something 90px tall. The
 * shapes come from each module's own `meta.shape`, so this file never names a module type —
 * adding a module still costs one registry line (doc 14 §7).
 */
export function TemplateThumbnail({ sectionTypes }: { sectionTypes: string[] }) {
  const shapes = sectionTypes.map((type) => getModule(type)?.meta.shape ?? 'row')

  return (
    <div
      aria-hidden
      className="flex h-[104px] w-full flex-col gap-1.5 overflow-hidden rounded-[6px] bg-[#131316] p-2"
    >
      {shapes.map((shape, index) => (
        <Shape key={index} shape={shape} />
      ))}
    </div>
  )
}

function Shape({ shape }: { shape: 'hero' | 'row' | 'grid' | 'prose' }) {
  if (shape === 'hero') {
    return (
      <div className="flex h-[30px] shrink-0 flex-col justify-end rounded-[3px] bg-gradient-to-t from-[#2f2f36] to-[#4a4a55] p-1">
        <span className="block h-[3px] w-[45%] rounded-full bg-white/70" />
        <span className="mt-[3px] block h-[2px] w-[30%] rounded-full bg-white/35" />
      </div>
    )
  }

  if (shape === 'row') {
    return (
      <div className="shrink-0">
        <span className="mb-1 block h-[2px] w-[26%] rounded-full bg-white/30" />
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className="h-[16px] w-[11px] shrink-0 rounded-[2px] bg-white/22" />
          ))}
        </div>
      </div>
    )
  }

  if (shape === 'grid') {
    return (
      <div className="shrink-0">
        <span className="mb-1 block h-[2px] w-[26%] rounded-full bg-white/30" />
        <div className="grid grid-cols-6 gap-1">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="h-[9px] rounded-[2px] bg-white/22" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 rounded-[3px] bg-white/[0.07] px-1.5 py-1">
      <span className="block h-[2px] w-[70%] rounded-full bg-white/30" />
      <span className="mt-[3px] block h-[2px] w-[85%] rounded-full bg-white/18" />
      <span className="mt-[3px] block h-[2px] w-[55%] rounded-full bg-white/18" />
    </div>
  )
}
