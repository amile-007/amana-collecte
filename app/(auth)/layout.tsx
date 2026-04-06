export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#CC0000] flex items-center justify-center shadow-md">
            <span className="text-white font-black text-xl tracking-tight">A</span>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900 leading-tight">AMANA Collecte</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              Barid Al Maghrib
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        {children}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Barid Al Maghrib — Service AMANA
      </p>
    </div>
  )
}
