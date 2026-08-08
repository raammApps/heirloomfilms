import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="gutter-x flex min-h-svh flex-col items-center justify-center text-center">
      <h1 className="type-display-lg mb-3">Nothing here</h1>
      <p className="type-body-lg mb-6 max-w-[40ch] text-text-mid">
        That address does not match a catalogue. Check the link you were sent.
      </p>
      <Link href="/" className="type-body text-accent underline underline-offset-4">
        Go to the start
      </Link>
    </main>
  )
}
