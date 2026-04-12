import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string
}

export interface ChatResponse {
  text: string
  action?: {
    label: string
    href: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise : minuscules + suppression des accents pour la comparaison */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function matches(text: string, keywords: string[]): boolean {
  const n = normalize(text)
  return keywords.some((k) => n.includes(normalize(k)))
}

// ─── Labels statuts ───────────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, string> = {
  en_attente:     'En attente de collecte ⏳',
  affectee:       'Collecteur assigné 👤',
  en_cours:       'Collecte en cours 🚗',
  collectee:      'Collecté 📦',
  en_transit:     'En transit 🚚',
  livree:         'Livré ✅',
  deposee_centre: 'Déposé au centre 🏢',
  en_instance:    'En instance — à retirer à l\'agence ⚠️',
  retournee:      'Retourné à l\'expéditeur ↩️',
  anomalie:       'Anomalie signalée 🔴',
  annulee:        'Annulé ❌',
}

// ─── Réponses prédéfinies ─────────────────────────────────────────────────────

const REPONSE_TARIFS: ChatResponse = {
  text:
    'Voici le barème tarifaire AMANA :\n\n' +
    '📦 Casablanca → Casablanca\n' +
    '  • 0 – 5 kg : 30 MAD\n' +
    '  • 5 – 15 kg : 50 MAD\n' +
    '  • 15 – 30 kg : 80 MAD\n\n' +
    '🚚 Casablanca ↔ Rabat\n' +
    '  • 0 – 5 kg : 45 MAD\n' +
    '  • 5 – 15 kg : 70 MAD\n' +
    '  • 15 – 30 kg : 110 MAD\n\n' +
    'Le tarif est calculé sur le poids réel ou volumétrique (le plus élevé des deux).',
}

const REPONSE_DELAIS: ChatResponse = {
  text:
    'Délais de livraison AMANA :\n\n' +
    '🏙️ Intra-ville : collecte et livraison le même jour (J ou J+1 selon l\'heure de la demande)\n\n' +
    '🛣️ Inter-ville : 24 à 48 h ouvrés pour les axes principaux Casablanca / Rabat\n\n' +
    'Une fois votre colis collecté, vous pouvez suivre sa progression en temps réel.',
}

const REPONSE_CREER: ChatResponse = {
  text: 'Pour créer une nouvelle demande de collecte, accédez à la page dédiée. Vous pouvez y saisir votre adresse de collecte sur carte, ajouter vos colis et obtenir le tarif immédiatement.',
  action: { label: 'Créer une demande', href: '/nouvelle-demande' },
}

const REPONSE_ANOMALIE: ChatResponse = {
  text:
    'Je suis désolé d\'apprendre que vous rencontrez un problème. Voici comment procéder :\n\n' +
    '1. Si votre colis est en cours de collecte, le collecteur peut déclarer une anomalie avec photo directement depuis son application.\n' +
    '2. Pour toute réclamation, contactez notre service client :\n' +
    '   📞 +212 537 00 00 00\n' +
    '   🕐 Lun – Ven, 8h – 17h\n\n' +
    'Munissez-vous de votre référence de demande (format AMD-YYYYMMDD-XXXX).',
}

const REPONSE_BONJOUR: ChatResponse = {
  text: 'Bonjour ! Je suis l\'assistant AMANA Collecte. Je peux vous aider à :\n\n• Suivre un colis (donnez-moi votre référence AMD-…)\n• Consulter les tarifs\n• Connaître les délais de livraison\n• Créer une nouvelle demande\n• Signaler un problème\n\nQue puis-je faire pour vous ?',
}

const REPONSE_DEFAULT: ChatResponse = {
  text: 'Je n\'ai pas bien compris votre demande. Voici ce que je sais faire :\n\n• 📦 Suivre un colis → donnez-moi votre référence AMD-…\n• 💰 Tarifs → demandez "quels sont les tarifs ?"\n• ⏱️ Délais → demandez "quels sont les délais ?"\n• ➕ Nouvelle demande → demandez "créer une demande"\n• ⚠️ Problème → demandez "signaler une anomalie"\n\nComment puis-je vous aider ?',
}

// ─── Lookup Supabase ──────────────────────────────────────────────────────────

async function lookupDemande(reference: string): Promise<ChatResponse> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: demande } = await supabase
      .from('demandes')
      .select('id, reference, statut, type_variante, updated_at')
      .eq('reference', reference.toUpperCase())
      .single()

    if (!demande) {
      return {
        text: `Aucune demande trouvée pour la référence ${reference.toUpperCase()}.\n\nVérifiez le format : AMD-YYYYMMDD-XXXX (exemple : AMD-20260412-0001).`,
      }
    }

    const { data: colis } = await supabase
      .from('colis')
      .select('destination_ville')
      .eq('demande_id', demande.id)

    const villes = [...new Set((colis ?? []).map((c: { destination_ville: string }) => c.destination_ville).filter(Boolean))]
    const statutLabel = STATUT_LABELS[demande.statut] ?? demande.statut
    const typeLabel = demande.type_variante === 'intra_ville' ? 'Intra-ville' : 'Inter-ville'
    const dateMAJ = new Date(demande.updated_at).toLocaleString('fr-MA', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })

    let text =
      `Voici le statut de votre demande :\n\n` +
      `📋 Référence : ${demande.reference}\n` +
      `📌 Statut : ${statutLabel}\n` +
      `🔄 Type : ${typeLabel}\n`

    if (villes.length) text += `📍 Destination : ${villes.join(', ')}\n`
    text += `🕐 Mise à jour : ${dateMAJ}`

    if (demande.statut === 'en_instance') {
      text += `\n\n⚠️ Votre colis est en instance. Merci de le retirer à l'agence sous 7 jours.`
    } else if (demande.statut === 'livree') {
      text += `\n\n✅ Votre colis a été livré avec succès.`
    } else if (demande.statut === 'retournee') {
      text += `\n\n↩️ Ce colis a été retourné à l'expéditeur.`
    }

    return {
      text,
      action: { label: 'Voir le détail complet', href: `/suivi/${demande.reference}` },
    }
  } catch {
    return {
      text: 'Impossible de récupérer les informations pour le moment. Veuillez réessayer ou consulter la page de suivi directement.',
      action: { label: 'Page de suivi', href: '/suivi' },
    }
  }
}

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { message } = body
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
  }

  const text = message.trim()

  // ── 1. Référence AMD détectée → lookup Supabase ───────────────────────────
  // Supporte AMD-YYYYMMDD-XXXX (prod) et AMD-DEMO-XXXX (démo)
  const refMatch = text.match(/AMD-[A-Z0-9]+-[A-Z0-9]+/i)
  if (refMatch) {
    const response = await lookupDemande(refMatch[0])
    return NextResponse.json(response)
  }

  // ── 2. Suivi / localisation ───────────────────────────────────────────────
  if (matches(text, ['suivre', 'où est', 'ou est', 'suivi', 'localiser', 'statut', 'où en est', 'ou en est', 'tracker', 'tracking'])) {
    return NextResponse.json({
      text: 'Pour suivre votre colis, communiquez-moi votre référence de demande.\n\nElle est au format AMD-YYYYMMDD-XXXX et figure sur votre e-mail de confirmation ou dans votre espace client.',
      action: { label: 'Page de suivi public', href: '/suivi' },
    } satisfies ChatResponse)
  }

  // ── 3. Tarifs ─────────────────────────────────────────────────────────────
  if (matches(text, ['tarif', 'prix', 'combien', 'cout', 'coût', 'montant', 'payer', 'paiement', 'facturation', 'bareme', 'barème'])) {
    return NextResponse.json(REPONSE_TARIFS)
  }

  // ── 4. Délais ─────────────────────────────────────────────────────────────
  if (matches(text, ['délai', 'delai', 'quand', 'durée', 'duree', 'temps', 'rapide', 'vite', 'combien de temps', 'express', 'urgence'])) {
    return NextResponse.json(REPONSE_DELAIS)
  }

  // ── 5. Anomalie / réclamation ─────────────────────────────────────────────
  if (matches(text, ['anomalie', 'problème', 'probleme', 'réclamation', 'reclamation', 'incident', 'perdu', 'abîmé', 'abime', 'cassé', 'casse', 'manquant', 'plainte', 'erreur', 'signaler', 'retard'])) {
    return NextResponse.json(REPONSE_ANOMALIE)
  }

  // ── 6. Créer une demande ──────────────────────────────────────────────────
  if (matches(text, ['créer', 'creer', 'nouvelle demande', 'envoyer', 'expédier', 'expedier', 'collecte', 'demande', 'commander', 'réserver', 'reserver'])) {
    return NextResponse.json(REPONSE_CREER)
  }

  // ── 7. Salutation ─────────────────────────────────────────────────────────
  if (matches(text, ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'salam', 'ahlan', 'aide', 'help', 'allo'])) {
    return NextResponse.json(REPONSE_BONJOUR)
  }

  // ── 8. Défaut ─────────────────────────────────────────────────────────────
  return NextResponse.json(REPONSE_DEFAULT)
}
