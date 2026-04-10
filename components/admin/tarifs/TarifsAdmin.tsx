'use client'

import { useState, useTransition } from 'react'
import { upsertBareme, toggleBaremeActif } from '@/lib/actions/admin'
import type { BaremeTarifaire } from '@/lib/types'

const VILLES = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda']

interface FormData {
  id?: string
  ville_origine: string
  ville_destination: string
  poids_min_kg: string
  poids_max_kg: string
  tarif_ht: string
}

const EMPTY_FORM: FormData = {
  ville_origine: '',
  ville_destination: '',
  poids_min_kg: '',
  poids_max_kg: '',
  tarif_ht: '',
}

export default function TarifsAdmin({ baremes }: { baremes: BaremeTarifaire[] }) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEdit = (b: BaremeTarifaire) => {
    setForm({
      id: b.id,
      ville_origine: b.ville_origine,
      ville_destination: b.ville_destination,
      poids_min_kg: String(b.poids_min_kg),
      poids_max_kg: String(b.poids_max_kg),
      tarif_ht: String(b.tarif_ht),
    })
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const pMin = parseFloat(form.poids_min_kg)
    const pMax = parseFloat(form.poids_max_kg)
    const tarif = parseFloat(form.tarif_ht)

    if (!form.ville_origine || !form.ville_destination) return setFormError('Villes requises')
    if (isNaN(pMin) || isNaN(pMax) || pMin >= pMax) return setFormError('Tranches de poids invalides')
    if (isNaN(tarif) || tarif <= 0) return setFormError('Tarif invalide')

    startTransition(async () => {
      const result = await upsertBareme({
        id: form.id,
        ville_origine: form.ville_origine,
        ville_destination: form.ville_destination,
        poids_min_kg: pMin,
        poids_max_kg: pMax,
        tarif_ht: tarif,
      })
      if (result.error) {
        setFormError(result.error)
      } else {
        setForm(EMPTY_FORM)
      }
    })
  }

  const handleToggle = (id: string, actif: boolean) => {
    startTransition(async () => {
      await toggleBaremeActif(id, actif)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Formulaire */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {form.id ? 'Modifier le barème' : 'Ajouter un barème'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ville origine</label>
            <select
              value={form.ville_origine}
              onChange={(e) => setForm({ ...form, ville_origine: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            >
              <option value="">— Choisir —</option>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ville destination</label>
            <select
              value={form.ville_destination}
              onChange={(e) => setForm({ ...form, ville_destination: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            >
              <option value="">— Choisir —</option>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Poids min (kg)</label>
            <input
              type="number" step="0.001" min="0"
              value={form.poids_min_kg}
              onChange={(e) => setForm({ ...form, poids_min_kg: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Poids max (kg)</label>
            <input
              type="number" step="0.001" min="0"
              value={form.poids_max_kg}
              onChange={(e) => setForm({ ...form, poids_max_kg: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tarif HT (MAD)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.tarif_ht}
              onChange={(e) => setForm({ ...form, tarif_ht: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
              placeholder="30"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-[#CC0000] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? '…' : form.id ? 'Modifier' : 'Ajouter'}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(EMPTY_FORM)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Barèmes tarifaires ({baremes.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origine</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Destination</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Poids min</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Poids max</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarif HT</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {baremes.map((b) => (
                <tr key={b.id} className={b.actif ? '' : 'opacity-50'}>
                  <td className="px-5 py-3 font-medium text-gray-900">{b.ville_origine}</td>
                  <td className="px-4 py-3 text-gray-700">{b.ville_destination}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.poids_min_kg} kg</td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.poids_max_kg} kg</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{b.tarif_ht} MAD</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.actif ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {b.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(b)}
                        className="text-xs text-gray-500 hover:text-[#CC0000] transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleToggle(b.id, !b.actif)}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        {b.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {baremes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400 italic">
                    Aucun barème tarifaire
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
