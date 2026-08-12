import { DEFAULT_LOCALE, LOCALES, type Locale, type LocalisedString } from './schema'

/**
 * Every user-visible string in the product comes from here (CLAUDE.md working agreements).
 * A missing Hindi value falls back to English *silently* — never a key, never a blank
 * (doc 10 §1, test 9).
 */

export const dictionary = {
  en: {
    'nav.skipToContent': 'Skip to content',
    'nav.profile': 'Profile',
    'nav.switchProfile': 'Switch profile',
    'nav.language': 'Language',

    'profileGate.heading': "Who's joining?",
    'profileGate.hint': 'Pick one so we can remember where you stopped watching.',
    'profileGate.skip': 'Skip for now',
    'profileGate.label.brideSide': "Bride's side",
    'profileGate.label.groomSide': "Groom's side",
    'profileGate.label.friends': 'Friends',
    'profileGate.label.family': 'Family',

    'billboard.play': 'Play',
    'billboard.moreInfo': 'More Info',

    'row.scrollLeft': 'Scroll left',
    'row.scrollRight': 'Scroll right',

    'title.play': 'Play',
    'title.share': 'Share',
    'title.close': 'Close',
    'title.previous': 'Previous title',
    'title.next': 'Next title',
    'title.credits': 'Credits',
    'title.processing': 'This film is still being prepared.',
    'title.shareCopied': 'Link copied',
    'title.shareWhatsapp': 'Share on WhatsApp',
    'title.shareCopy': 'Copy link',
    'title.watchFrom': 'Share from this moment',

    'player.back': 'Back',
    'player.resumingFrom': 'Resuming from {time}',
    'player.startOver': 'Start over',
    'player.playPause': 'Play or pause',
    'player.rewind': 'Back 10 seconds',
    'player.forward': 'Forward 10 seconds',
    'player.mute': 'Mute',
    'player.unmute': 'Unmute',
    'player.fullscreen': 'Fullscreen',
    'player.pip': 'Picture in picture',
    'player.captions': 'Captions',
    'player.quality': 'Quality',
    'player.speed': 'Speed',
    'player.auto': 'Auto',
    'player.seek': 'Seek',
    'player.error.notReady': 'This film is still processing. Try again in a few minutes.',
    'player.error.unavailable': 'This film is not available right now.',
    'player.error.network': 'The connection dropped. Retrying…',
    'player.needsJs': 'Playback needs JavaScript. Everything else on this page works without it.',

    'photo.open': 'Open photo',
    'photo.previous': 'Previous photo',
    'photo.next': 'Next photo',
    'photo.close': 'Close photo',
    'photo.counter': '{index} of {total}',

    'letter.signature': 'With love,',

    'checklist.progress': '{done} of {total}',
    'randomiser.again': 'Again',
    'randomiser.waiting': '{count} to choose from',

    'footer.presentedBy': 'Presented by {name}',
    'footer.privacy': 'Privacy',
    'footer.renew': 'Renew',

    'state.draft.heading': 'Not quite ready',
    'state.draft.body': 'This catalogue has not been published yet. Check back shortly.',
    'state.empty.heading': 'Nothing published yet',
    'state.empty.body': 'Films appear here as soon as they are published.',

    'locked.heading': 'This one is private',
    'locked.body': 'Enter the passcode from your invitation.',
    'locked.passcode': 'Passcode',
    'locked.submit': 'Continue',
    'locked.wrong': 'That passcode did not work.',
    'locked.lockedOut': 'Too many attempts. Try again in 15 minutes.',

    'renew.heading': 'Your catalogue is waiting',
    'renew.body':
      'The subscription has lapsed, so playback is paused. Nothing has been deleted — renew and everything is back.',
    'renew.cta': 'Renew',

    'meta.duration': '{minutes} min',
    'meta.photos': '{count} photos',
    'common.loading': 'Loading',
    'common.retry': 'Retry',
    'common.dismiss': 'Dismiss',
  },

  hi: {
    'nav.skipToContent': 'मुख्य सामग्री पर जाएँ',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.switchProfile': 'प्रोफ़ाइल बदलें',
    'nav.language': 'भाषा',

    'profileGate.heading': 'कौन देख रहा है?',
    'profileGate.hint': 'एक चुनें ताकि हम याद रख सकें आपने कहाँ छोड़ा था।',
    'profileGate.skip': 'अभी छोड़ें',
    'profileGate.label.brideSide': 'दुल्हन पक्ष',
    'profileGate.label.groomSide': 'दूल्हा पक्ष',
    'profileGate.label.friends': 'दोस्त',
    'profileGate.label.family': 'परिवार',

    'billboard.play': 'चलाएँ',
    'billboard.moreInfo': 'और जानकारी',

    'row.scrollLeft': 'बाएँ स्क्रॉल करें',
    'row.scrollRight': 'दाएँ स्क्रॉल करें',

    'title.play': 'चलाएँ',
    'title.share': 'साझा करें',
    'title.close': 'बंद करें',
    'title.previous': 'पिछला',
    'title.next': 'अगला',
    'title.credits': 'श्रेय',
    'title.processing': 'यह फ़िल्म अभी तैयार हो रही है।',
    'title.shareCopied': 'लिंक कॉपी हो गया',
    'title.shareWhatsapp': 'व्हाट्सएप पर भेजें',
    'title.shareCopy': 'लिंक कॉपी करें',
    'title.watchFrom': 'इसी पल से साझा करें',

    'player.back': 'वापस',
    'player.resumingFrom': '{time} से आगे',
    'player.startOver': 'शुरू से चलाएँ',
    'player.playPause': 'चलाएँ या रोकें',
    'player.rewind': '10 सेकंड पीछे',
    'player.forward': '10 सेकंड आगे',
    'player.mute': 'आवाज़ बंद',
    'player.unmute': 'आवाज़ चालू',
    'player.fullscreen': 'फ़ुल स्क्रीन',
    'player.pip': 'पिक्चर इन पिक्चर',
    'player.captions': 'सबटाइटल',
    'player.quality': 'क्वालिटी',
    'player.speed': 'गति',
    'player.auto': 'स्वतः',
    'player.seek': 'आगे-पीछे करें',
    'player.error.notReady': 'यह फ़िल्म अभी तैयार हो रही है। कुछ मिनट बाद देखें।',
    'player.error.unavailable': 'यह फ़िल्म अभी उपलब्ध नहीं है।',
    'player.error.network': 'कनेक्शन टूट गया। फिर से कोशिश हो रही है…',
    'player.needsJs': 'वीडियो चलाने के लिए JavaScript ज़रूरी है। बाकी पेज बिना उसके भी चलता है।',

    'photo.open': 'फ़ोटो खोलें',
    'photo.previous': 'पिछली फ़ोटो',
    'photo.next': 'अगली फ़ोटो',
    'photo.close': 'फ़ोटो बंद करें',
    'photo.counter': '{total} में से {index}',

    'letter.signature': 'प्यार के साथ,',

    'checklist.progress': '{total} में से {done}',
    'randomiser.again': 'फिर से',
    'randomiser.waiting': '{count} में से एक',

    'footer.presentedBy': 'प्रस्तुति: {name}',
    'footer.privacy': 'गोपनीयता',
    'footer.renew': 'नवीनीकरण',

    'state.draft.heading': 'अभी तैयार नहीं',
    'state.draft.body': 'यह कैटलॉग अभी प्रकाशित नहीं हुआ है। थोड़ी देर बाद देखें।',
    'state.empty.heading': 'अभी कुछ प्रकाशित नहीं',
    'state.empty.body': 'फ़िल्में प्रकाशित होते ही यहाँ दिखेंगी।',

    'locked.heading': 'यह निजी है',
    'locked.body': 'अपने निमंत्रण में दिया पासकोड डालें।',
    'locked.passcode': 'पासकोड',
    'locked.submit': 'आगे बढ़ें',
    'locked.wrong': 'यह पासकोड सही नहीं है।',
    'locked.lockedOut': 'बहुत बार कोशिश हुई। 15 मिनट बाद फिर देखें।',

    'renew.heading': 'आपका कैटलॉग सुरक्षित है',
    'renew.body':
      'सदस्यता समाप्त हो गई है, इसलिए वीडियो रुके हुए हैं। कुछ भी मिटाया नहीं गया — नवीनीकरण करते ही सब वापस।',
    'renew.cta': 'नवीनीकरण करें',

    'meta.duration': '{minutes} मिनट',
    'meta.photos': '{count} फ़ोटो',
    'common.loading': 'लोड हो रहा है',
    'common.retry': 'फिर कोशिश करें',
    'common.dismiss': 'हटाएँ',
  },
} as const

export type MessageKey = keyof (typeof dictionary)['en']

type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** Translate a key. Missing Hindi falls back to English; a missing key returns the key. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const table = dictionary[locale] as Record<string, string> | undefined
  const value = table?.[key] ?? (dictionary[DEFAULT_LOCALE] as Record<string, string>)[key]
  if (value === undefined) return key
  return interpolate(value, vars)
}

/** Bind a locale once, at the route boundary, and pass `t` down as a prop. */
export function createTranslator(locale: Locale) {
  return (key: MessageKey, vars?: Vars) => translate(locale, key, vars)
}
export type Translator = ReturnType<typeof createTranslator>

/**
 * Resolve tenant-authored content. The same silent-fallback rule as `translate`, applied to
 * operator input rather than to our dictionary.
 */
export function resolveLocalised(
  value: LocalisedString | string | null | undefined,
  locale: Locale,
): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  const candidate = value[locale]
  if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate
  return value.en ?? ''
}

/** Narrow anything (a cookie, a query param, an Accept-Language header) to a supported locale. */
export function parseLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE
  const head = input.toLowerCase().split(',')[0]?.split('-')[0]?.trim()
  return (LOCALES as readonly string[]).includes(head ?? '') ? (head as Locale) : DEFAULT_LOCALE
}

export const LOCALE_LABELS: Record<Locale, string> = { en: 'EN', hi: 'हिं' }
