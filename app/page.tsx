export const dynamic = 'force-dynamic'

// Cette page n'est atteinte que par les utilisateurs authentifiés
// (le proxy redirige les non-connectés vers /login).
// Les dashboards par rôle seront ajoutés ici.
export default function RootPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>AMANA Collecte</h1>
      <p>Connecté — dashboard à venir.</p>
    </div>
  )
}
