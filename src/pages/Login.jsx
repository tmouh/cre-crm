import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/Vtransparent.png" alt="Vanadium" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Vanadium OS</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Sign in to your workspace</p>
        </div>

        {/* Form */}
        <div className="v-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="v-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="v-input"
                placeholder="you@company.com"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="v-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="v-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="v-btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-2xs text-slate-400 dark:text-slate-500 mt-6">
          Access is by invitation only. Contact your admin to create an account.
        </p>
      </div>
    </div>
  )
}
