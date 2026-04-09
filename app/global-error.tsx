'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
          Une erreur inattendue s&apos;est produite
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Veuillez réessayer ou contacter le support si le problème persiste.
        </p>
        <button
          onClick={reset}
          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#E30613', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
