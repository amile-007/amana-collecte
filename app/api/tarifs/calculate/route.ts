import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTarif } from '@/lib/db/queries'
import { TarifCalculSchema } from '@/lib/schemas'
import { logger } from '@/lib/logger'

// Cache 1h côté CDN — les barèmes changent rarement
export const revalidate = 3600

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = TarifCalculSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { ville_origine, ville_destination, poids_kg, longueur, largeur, hauteur } = parsed.data

    // Calcul poids volumétrique
    let poids_volumetrique = 0
    if (longueur && largeur && hauteur) {
      poids_volumetrique = (longueur * largeur * hauteur) / 3000
    }
    const poids_reference = Math.max(poids_kg, poids_volumetrique)

    // Recherche dans le barème
    const { data: tarif, error } = await getTarif(
      supabase,
      ville_origine,
      ville_destination,
      poids_reference
    )

    if (error || !tarif) {
      return NextResponse.json(
        { error: `Aucun tarif trouvé pour ${ville_origine} → ${ville_destination} (${poids_reference.toFixed(2)} kg)` },
        { status: 404 }
      )
    }

    logger.info('Tarif calculé', { ville_origine, ville_destination, poids_reference, tarif: tarif.tarif_ht })

    return NextResponse.json({
      tarif_ht:           tarif.tarif_ht,
      poids_declare:      poids_kg,
      poids_volumetrique: Math.round(poids_volumetrique * 1000) / 1000,
      poids_reference:    Math.round(poids_reference * 1000) / 1000,
    }, {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (err) {
    logger.error('POST /api/tarifs/calculate failed', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
