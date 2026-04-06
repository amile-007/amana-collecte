/**
 * Barème tarifaire simplifié — démo AMANA Collecte
 * Source : PROJET.md section 9
 *
 * Structure : BAREME[origine][destination] = [tarif_0_5kg, tarif_5_15kg, tarif_15_30kg]
 */
const BAREME: Record<string, Record<string, [number, number, number]>> = {
  Casablanca: {
    Casablanca: [30, 50, 80],
    Rabat: [45, 70, 110],
  },
  Rabat: {
    Casablanca: [45, 70, 110],
    Rabat: [30, 50, 80],
  },
}

export function calculerPoidsVolumetrique(l: number, larg: number, h: number): number {
  return Math.round(((l * larg * h) / 3000) * 1000) / 1000
}

export function calculerPoidsReference(poidsDeclare: number, poidsVolumetrique: number): number {
  return Math.max(poidsDeclare, poidsVolumetrique)
}

export function calculerTarif(
  villeOrigine: string,
  villeDestination: string,
  poidsReference: number
): number {
  const tarifs = BAREME[villeOrigine]?.[villeDestination]
  if (!tarifs) return 0
  if (poidsReference <= 5) return tarifs[0]
  if (poidsReference <= 15) return tarifs[1]
  return tarifs[2]
}

export const VILLES_DEMO = ['Casablanca', 'Rabat'] as const
export type VilleDemo = (typeof VILLES_DEMO)[number]
