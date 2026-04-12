'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { ChatResponse } from '@/app/api/chatbot/route'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: ChatResponse['action']
}

// ─── Suggestions rapides ──────────────────────────────────────────────────────

const SUGGESTIONS: { label: string; text: string }[] = [
  { label: 'Suivre mon colis', text: 'Comment suivre mon colis ?' },
  { label: 'Tarifs',           text: 'Quels sont les tarifs ?' },
  { label: 'Délais',           text: 'Quels sont les délais de livraison ?' },
  { label: 'Créer une demande', text: 'Je veux créer une demande de collecte.' },
]

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ChatBot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      const data: ChatResponse = res.ok
        ? await res.json()
        : { text: 'Une erreur est survenue. Veuillez réessayer.' }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.text, action: data.action },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Impossible de contacter l\'assistant. Vérifiez votre connexion.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading])

  return (
    <>
      {/* ── Bouton flottant ─────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#E30613] shadow-xl flex items-center justify-center hover:bg-[#c00510] transition-transform hover:scale-105 active:scale-95"
          aria-label="Ouvrir l'assistant AMANA"
        >
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed z-50 bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden
                     bottom-0 right-0 w-full h-[85vh]
                     sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[540px] sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#E30613] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">Assistant AMANA</p>
                <p className="text-white/70 text-xs">Réponse instantanée</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

            {/* État vide — suggestions */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center mt-6 px-2">
                <p className="text-gray-600 text-sm font-medium mb-1">
                  Bonjour ! Comment puis-je vous aider ?
                </p>
                <p className="text-gray-400 text-xs mb-5">
                  Colis, tarifs, délais — posez votre question.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.text)}
                      className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-full
                                 hover:border-[#E30613]/40 hover:bg-[#E30613]/5 hover:text-[#E30613] transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bulles de messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-[#E30613] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Bouton action sous la bulle assistant */}
                {msg.role === 'assistant' && msg.action && (
                  <Link
                    href={msg.action.href}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#E30613] font-medium
                               border border-[#E30613]/30 bg-[#E30613]/5 px-3 py-1.5 rounded-full
                               hover:bg-[#E30613]/10 transition-colors"
                  >
                    {msg.action.label}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}
              </div>
            ))}

            {/* Indicateur de chargement */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder="Votre message..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]
                         disabled:bg-gray-50"
              disabled={loading}
              maxLength={500}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="h-10 w-10 rounded-xl bg-[#E30613] text-white flex items-center justify-center
                         disabled:opacity-40 hover:bg-[#c00510] transition-colors shrink-0"
              aria-label="Envoyer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
