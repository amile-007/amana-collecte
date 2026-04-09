/**
 * Wrapper de build pour corriger le problème de casse Windows.
 *
 * Sur Windows, D:\fikra\projet et D:\FIKRA\PROJET sont le même répertoire
 * (même inode NTFS) mais Webpack 5 les traite comme deux modules distincts,
 * brisant les singletons Next.js (workStore invariant).
 *
 * Fix : déterminer le chemin canonique via le package.json de Next.js
 * (qui reflète le casing réel du disque), puis lancer le build depuis ce chemin.
 * Sur Linux/Mac (Vercel), cwd et canonical sont identiques — aucun effet.
 */

import { spawnSync } from 'child_process'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)

// Chemin canonique = répertoire parent de node_modules/next
const nextPkg = require.resolve('next/package.json')
const canonicalRoot = path.dirname(path.dirname(path.dirname(nextPkg)))

const currentCwd = process.cwd()
const cwd = (canonicalRoot.toLowerCase() === currentCwd.toLowerCase())
  ? canonicalRoot   // utilise le casing canonique (uppercase sur Windows si applicable)
  : currentCwd

// Lance: node node_modules/next/dist/bin/next build --webpack
const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next')

console.log(`[build] cwd: ${cwd}`)
console.log(`[build] next: ${nextBin}`)

const result = spawnSync(
  process.execPath,
  [nextBin, 'build', '--webpack'],
  { cwd, stdio: 'inherit', env: process.env }
)

process.exit(result.status ?? 1)
