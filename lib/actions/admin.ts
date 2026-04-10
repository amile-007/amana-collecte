'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') throw new Error('Non autorisé')
  return { supabase, userId: user.id }
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

export async function toggleUtilisateurActif(
  userId: string,
  actif: boolean
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAdmin()
    await supabase.from('profiles').update({ actif }).eq('id', userId)
    revalidatePath('/admin/utilisateurs')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function changerRole(
  userId: string,
  role: Role
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAdmin()
    await supabase.from('profiles').update({ role }).eq('id', userId)
    revalidatePath('/admin/utilisateurs')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

// ─── Barèmes tarifaires ───────────────────────────────────────────────────────

export async function upsertBareme(data: {
  id?: string
  ville_origine: string
  ville_destination: string
  poids_min_kg: number
  poids_max_kg: number
  tarif_ht: number
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAdmin()
    if (data.id) {
      await supabase
        .from('baremes_tarifaires')
        .update({
          ville_origine:    data.ville_origine,
          ville_destination: data.ville_destination,
          poids_min_kg:     data.poids_min_kg,
          poids_max_kg:     data.poids_max_kg,
          tarif_ht:         data.tarif_ht,
        })
        .eq('id', data.id)
    } else {
      await supabase.from('baremes_tarifaires').insert({
        ville_origine:     data.ville_origine,
        ville_destination: data.ville_destination,
        poids_min_kg:      data.poids_min_kg,
        poids_max_kg:      data.poids_max_kg,
        tarif_ht:          data.tarif_ht,
        version:           1,
        actif:             true,
      })
    }
    revalidatePath('/admin/tarifs')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}

export async function toggleBaremeActif(
  id: string,
  actif: boolean
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAdmin()
    await supabase.from('baremes_tarifaires').update({ actif }).eq('id', id)
    revalidatePath('/admin/tarifs')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue' }
  }
}
