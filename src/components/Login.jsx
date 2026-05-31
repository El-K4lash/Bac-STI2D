import { useState } from 'react'
import { getDBKey } from '../hooks/useDB'

export default function Login({ onLogin }) {
  const [prenom, setPrenom] = useState('')
  const [error, setError] = useState('')

  // Lister les comptes existants
  const existingUsers = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('bac_sti2d_') && key !== 'bac_sti2d_current_user') {
      const name = key.replace('bac_sti2d_', '')
      existingUsers.push(name.charAt(0).toUpperCase() + name.slice(1))
    }
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    const clean = prenom.trim()
    if (!clean || clean.length < 2) { setError('Entre au moins 2 caractères'); return }
    if (!/^[a-zA-ZÀ-ÿ\s-]+$/.test(clean)) { setError('Prénom invalide (lettres uniquement)'); return }
    onLogin(clean)
  }

  const handleQuickLogin = (name) => {
    onLogin(name)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-lg shadow-blue-500/20">
            B
          </div>
          <h1 className="text-2xl font-black text-white">Bac STI2D 2026</h1>
          <p className="text-gray-500 text-sm mt-1">Révisions partagées · Chaque profil a ses propres stats</p>
        </div>

        {/* Comptes existants */}
        {existingUsers.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Comptes existants</div>
            <div className="space-y-2">
              {existingUsers.map(name => (
                <button key={name} onClick={() => handleQuickLogin(name)}
                  className="w-full flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/50 rounded-xl px-4 py-3 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold text-sm">{name}</div>
                    <div className="text-gray-500 text-xs">Continuer la révision</div>
                  </div>
                  <span className="ml-auto text-gray-600 group-hover:text-blue-400 transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nouveau compte */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {existingUsers.length > 0 ? 'Nouveau compte' : 'Entrer ton prénom'}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={prenom}
              onChange={e => { setPrenom(e.target.value); setError('') }}
              placeholder="Ton prénom..."
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder-gray-600"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit"
              className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              {existingUsers.length > 0 ? '+ Créer ce compte' : 'Commencer →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Les données sont sauvegardées localement dans ton navigateur
        </p>
      </div>
    </div>
  )
}
