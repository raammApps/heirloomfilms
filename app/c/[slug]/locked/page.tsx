import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { PasscodeGate } from '@/components/streaming/PasscodeGate'
import { ThemeStyle } from '@/components/chrome/ThemeStyle'
import { resolveAccess } from '@/lib/catalogue-access'
import { createTranslator, parseLocale, resolveLocalised } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function LockedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const verdict = await resolveAccess(slug)

  if (verdict.kind === 'missing') notFound()
  // Already satisfied, or never needed: do not strand a guest on a gate they have passed.
  if (verdict.kind === 'ok') redirect('/')

  const locale = parseLocale((await cookies()).get('mehfil_locale')?.value)
  const t = createTranslator(locale)

  return (
    <>
      <ThemeStyle branding={verdict.catalogue.branding} />
      <PasscodeGate
        catalogueSlug={slug}
        coupleName={resolveLocalised(verdict.catalogue.coupleName, locale)}
        strings={{
          heading: t('locked.heading'),
          body: t('locked.body'),
          passcode: t('locked.passcode'),
          submit: t('locked.submit'),
          wrong: t('locked.wrong'),
          lockedOut: t('locked.lockedOut'),
        }}
      />
    </>
  )
}
