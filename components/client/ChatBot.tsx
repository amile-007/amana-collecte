'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ─── Suggestions rapides ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'Suivre mon colis', text: 'Comment puis-je suivre mon colis ?' },
  { label: 'Tarifs', text: 'Quels sont les tarifs AMANA ?' },
  { label: 'Créer une demande', text: 'Comment créer une demande de collecte ?' },
]

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMsg]
    setMessages([...updatedMessages, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    // Détection automatique de référence dans le message
    const refMatch = trimmed.match(/AMD-\d{8}-\d{4}/i)
    const demandeRef = refMatch ? refMatch[0].toUpperCase() : undefined

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          demandeRef,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Erreur réseau')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const parsed = JSON.parse(raw)
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              accumulatedText += parsed.delta.text
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: accumulatedText,
                }
                return updated
              })
            }
          } catch {
            // Ligne SSE non-JSON (event:, ping, etc.) — ignorée
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

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

      {/* ── Panel chatbot ────────────────────────────────────────────────── */}
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
                <p className="text-white/70 text-xs">Toujours disponible</p>
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
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center mt-6 px-2">
                <p className="text-gray-600 text-sm font-medium mb-1">Bonjour, comment puis-je vous aider ?</p>
                <p className="text-gray-400 text-xs mb-5">
                  Posez-moi vos questions sur vos colis, les tarifs ou les délais.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.text)}
                      className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-full hover:border-[#E30613]/40 hover:bg-[#E30613]/5 hover:text-[#E30613] transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isLastAssistant =
                  msg.role === 'assistant' && i === messages.length - 1
                const showTyping = isLastAssistant && loading && !msg.content

                return (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.role === 'user'
                          ? 'bg-[#E30613] text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {showTyping ? (
                        <span className="flex gap-1 items-center py-0.5">
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )
              })
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
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613] disabled:bg-gray-50"
              disabled={loading}
              maxLength={1000}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="h-10 w-10 rounded-xl bg-[#E30613] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#c00510] transition-colors shrink-0"
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
