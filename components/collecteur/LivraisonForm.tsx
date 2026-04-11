'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmerLivraison } from '@/lib/actions/collecteur'

interface LivraisonFormProps {
  demandeId: string
  reference: string
  destinataireNom: string
  nbColis: number
}

export default function LivraisonForm({
  demandeId,
  reference,
  destinataireNom,
  nbColis,
}: LivraisonFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // ─── Signature canvas ─────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const [signatureFaite, setSignatureFaite] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    isDrawingRef.current = true
    lastPosRef.current = getPos(e)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    const pos = getPos(e)
    if (!pos || !lastPosRef.current) return
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
    setSignatureFaite(true)
  }

  const stopDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    isDrawingRef.current = false
    lastPosRef.current = null
  }

  const effacerSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignatureFaite(false)
  }

  // ─── Photo ────────────────────────────────────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ─── Confirmation ─────────────────────────────────────────────────────────
  const peutConfirmer = signatureFaite && photoPreview !== null

  const handleConfirmer = () => {
    if (!peutConfirmer) return
    setError('')
    startTransition(async () => {
      const result = await confirmerLivraison(demandeId, {
        signatureRecueillie: true,
        photoUrl: photoFile?.name ?? 'preuve-photo',
      })
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/collecteur/missions')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5 p-4">

      {/* Info demande */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-400 font-mono">{reference}</p>
        <p className="text-sm font-semibold text-gray-900 mt-1">{destinataireNom}</p>
        <p className="text-xs text-gray-500 mt-0.5">{nbColis} colis à livrer</p>
      </div>

      {/* Signature */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-900">
            Signature du destinataire
            <span className="ml-1 text-[#E30613]">*</span>
          </label>
          {signatureFaite && (
            <button
              onClick={effacerSignature}
              className="text-xs text-gray-400 hover:text-gray-700 underline"
            >
              Effacer
            </button>
          )}
        </div>
        <div className={`rounded-xl border-2 overflow-hidden ${
          signatureFaite ? 'border-green-400' : 'border-dashed border-gray-300'
        }`}>
          <canvas
            ref={canvasRef}
            width={600}
            height={180}
            className="w-full touch-none bg-white cursor-crosshair"
            style={{ height: 160 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        {!signatureFaite && (
          <p className="text-xs text-gray-400 text-center">Faites signer le destinataire dans le cadre ci-dessus</p>
        )}
        {signatureFaite && (
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Signature recueillie
          </p>
        )}
      </div>

      {/* Photo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-900">
          Photo de preuve
          <span className="ml-1 text-[#E30613]">*</span>
        </label>

        {photoPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-green-400">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Preuve de livraison"
              className="w-full object-cover"
              style={{ maxHeight: 200 }}
            />
            <button
              onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}
              className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
            >
              Changer
            </button>
            <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Photo enregistrée
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Prendre une photo</p>
              <p className="text-xs text-gray-400 mt-0.5">ou importer depuis la galerie</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePhoto}
            />
          </label>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-700 mb-1">Avant de confirmer :</p>
        <div className={`flex items-center gap-2 text-xs ${signatureFaite ? 'text-green-600' : 'text-gray-400'}`}>
          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${signatureFaite ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
            {signatureFaite && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          </span>
          Signature du destinataire
        </div>
        <div className={`flex items-center gap-2 text-xs ${photoPreview ? 'text-green-600' : 'text-gray-400'}`}>
          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${photoPreview ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
            {photoPreview && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          </span>
          Photo de preuve
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirm */}
      <button
        onClick={handleConfirmer}
        disabled={!peutConfirmer || isPending}
        className="w-full bg-[#E30613] text-white text-sm font-bold py-3.5 rounded-xl active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Confirmation en cours…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Confirmer la livraison
          </>
        )}
      </button>

      <button
        onClick={() => router.back()}
        disabled={isPending}
        className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 disabled:opacity-50"
      >
        ← Retour aux missions
      </button>
    </div>
  )
}
