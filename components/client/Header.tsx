import { signOut } from '@/lib/actions/auth'
import type { Profile } from '@/lib/types'

interface HeaderProps {
  profile: Profile
  onMenuClick: () => void
}

export default function Header({ profile, onMenuClick }: HeaderProps) {
  const initials = `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.toUpperCase()
  const fullName = `${profile.prenom} ${profile.nom}`

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Gauche : hamburger (mobile) + label */}
      <div className="flex items-center gap-2">
        {/* Bouton hamburger visible uniquement sur mobile */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden md:flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#CC0000]" />
          <span className="text-sm font-medium text-gray-500">Portail client</span>
        </div>
      </div>

      {/* Droite : avatar + déconnexion */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#CC0000] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{fullName}</p>
            <p className="text-[10px] text-gray-400 leading-tight capitalize">{profile.role.replace('_', ' ')}</p>
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#CC0000] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </form>
      </div>
    </header>
  )
}
