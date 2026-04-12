import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  demandeRef?: string
}

// ─── Prompt système AMANA ─────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Tu es l'assistant virtuel d'AMANA Collecte, le service de collecte de colis de BARID AL MAGHRIB (La Poste Maroc).

Ton rôle :
- Aider les clients à suivre leurs colis, comprendre les statuts, et utiliser la plateforme.
- Répondre aux questions sur les tarifs, les délais, et les procédures.
- Guider les clients pour créer une demande de collecte.
- Orienter vers le service client humain pour les cas complexes.

Ce que tu sais sur AMANA Collecte :
- Service de collecte de colis à domicile au Maroc (Casablanca, Rabat et autres villes).
- Deux variantes : intra-ville (collecte + livraison directe le même jour) et inter-ville (collecte → centre BARID AL MAGHRIB → livraison réseau national).
- Tarifs indicatifs intra-ville Casablanca : 30 MAD (0-5 kg), 50 MAD (5-15 kg), 80 MAD (15-30 kg).
- Tarifs indicatifs inter-ville Casablanca → Rabat : 45 MAD (0-5 kg), 70 MAD (5-15 kg), 110 MAD (15-30 kg).
- Délai intra-ville : même journée ou J+1.
- Délai inter-ville : 2 à 5 jours ouvrés selon la destination.
- Statuts possibles : En attente → Collecteur assigné → En cours de collecte → Collectée → En transit / Livrée / Déposée au centre.
- Si un colis est "En instance" : le destinataire doit le retirer à l'agence sous 7 jours.
- Preuve de livraison : signature électronique + photo prise par le collecteur.
- Pour toute réclamation : contacter le service client au +212 537 00 00 00.

Références de demande : format AMD-YYYYMMDD-XXXX (exemple : AMD-20260412-0042).

Règles de conduite :
- Réponds uniquement en français.
- Sois concis, professionnel et chaleureux.
- Ne divulgue jamais d'informations personnelles sur d'autres clients.
- Si tu ne sais pas, dis-le clairement et oriente vers le service client.
- Pour les questions hors périmètre AMANA, redirige poliment vers le sujet principal.
`

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 503 })
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { messages, demandeRef } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages requis.' }, { status: 400 })
  }

  // ── Enrichissement contextuel si référence fournie ────────────────────────
  let contextSupplementaire = ''

  if (demandeRef && /^AMD-\d{8}-\d{4}$/i.test(demandeRef)) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: demande } = await supabase
        .from('demandes')
        .select('reference, statut, type_variante, created_at, updated_at')
        .eq('reference', demandeRef.toUpperCase())
        .single()

      if (demande) {
        const { data: colis } = await supabase
          .from('colis')
          .select('destination_ville, statut')
          .eq('demande_id', (
            await supabase
              .from('demandes')
              .select('id')
              .eq('reference', demandeRef.toUpperCase())
              .single()
          ).data?.id)

        const villes = [...new Set((colis ?? []).map((c: { destination_ville: string }) => c.destination_ville).filter(Boolean))]

        contextSupplementaire = `

--- Contexte colis détecté ---
Référence : ${demande.reference}
Statut actuel : ${demande.statut}
Type : ${demande.type_variante === 'intra_ville' ? 'Intra-ville' : 'Inter-ville'}
Destination(s) : ${villes.length ? villes.join(', ') : 'non renseignée'}
Créé le : ${new Date(demande.created_at).toLocaleDateString('fr-MA')}
Dernière mise à jour : ${new Date(demande.updated_at).toLocaleDateString('fr-MA')}
--- Fin contexte ---

Utilise ces informations pour répondre aux questions du client sur ce colis.`
      }
    } catch {
      // Contexte Supabase non critique — on continue sans
    }
  }

  const systemPrompt = BASE_SYSTEM_PROMPT + contextSupplementaire

  // ── Appel Anthropic en streaming ──────────────────────────────────────────
  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages: messages.slice(-10), // Limite l'historique aux 10 derniers messages
    }),
  })

  if (!anthropicResponse.ok) {
    const err = await anthropicResponse.text()
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: 'Erreur lors de la génération de la réponse.' }, { status: 502 })
  }

  // Proxy direct du stream SSE Anthropic vers le client
  return new Response(anthropicResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
