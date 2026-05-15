import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/cn'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  // Redirect if already logged in
  const from = (location.state as { from?: string })?.from ?? '/app/home'

  function validate(): boolean {
    const errors: typeof validationErrors = {}
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    if (!validate()) return

    try {
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch {
      // error is set in the store
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#8b8fa3] transition-colors hover:text-[#f0f2ff]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#f0f2ff]">
            Welcome back
          </h1>
          <p className="text-base text-[#8b8fa3]">
            Sign in to your Neighborly account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Server error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[#c0c3d6]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationErrors.email) {
                    setValidationErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                placeholder="you@example.com"
                className={cn(
                  'w-full rounded-lg border bg-[#141729] py-2.5 pl-10 pr-3 text-sm text-[#f0f2ff] placeholder-[#5a5f7a] transition-colors',
                  'focus:border-[#6c5ce7] focus:outline-none focus:ring-1 focus:ring-[#6c5ce7]',
                  validationErrors.email
                    ? 'border-red-500/50'
                    : 'border-[#2a2f4a]'
                )}
              />
            </div>
            {validationErrors.email && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#c0c3d6]"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (validationErrors.password) {
                    setValidationErrors((prev) => ({ ...prev, password: undefined }))
                  }
                }}
                placeholder="Enter your password"
                className={cn(
                  'w-full rounded-lg border bg-[#141729] py-2.5 pl-10 pr-10 text-sm text-[#f0f2ff] placeholder-[#5a5f7a] transition-colors',
                  'focus:border-[#6c5ce7] focus:outline-none focus:ring-1 focus:ring-[#6c5ce7]',
                  validationErrors.password
                    ? 'border-red-500/50'
                    : 'border-[#2a2f4a]'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5f7a] transition-colors hover:text-[#c0c3d6]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all',
              'bg-[#6c5ce7] hover:bg-[#5a4bd1] active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-[#8b8fa3]">
          Don't have an account?{' '}
          <Link
            to="/auth/register"
            className="font-medium text-[#6c5ce7] transition-colors hover:text-[#5a4bd1]"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
