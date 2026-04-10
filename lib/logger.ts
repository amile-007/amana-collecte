// Structured JSON logger for Vercel Functions
// Outputs JSON lines — Vercel log drain compatible

type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: Level
  msg: string
  timestamp: string
  [key: string]: unknown
}

function log(level: Level, msg: string, ctx: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...ctx,
  }
  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info',  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn',  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
}

// Convenience: log a slow request warning
export function warnIfSlow(label: string, startMs: number, thresholdMs = 3000) {
  const elapsed = Date.now() - startMs
  if (elapsed > thresholdMs) {
    logger.warn('Slow request detected', { label, elapsed_ms: elapsed, threshold_ms: thresholdMs })
  }
}
