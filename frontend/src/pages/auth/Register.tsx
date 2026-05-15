import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/cn'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  AlertCircle,
  Loader2,
  UserPlus,
  ArrowLeft,
  Check,
} from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    password?: string
    confirmPassword?: string
    terms?: string
  }>({})

  function validate(): boolean {
    const errors: typeof validationErrors = {}

    if (!firstName.trim()) {
      errors.firstName = 'First name is required'
    } else if (firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters'
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required'
    } else if (lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters'
    }

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    if (phone.trim() && !/^[\d\s\-+()]{7,20}$/.test(phone.trim())) {
      errors.phone = 'Please enter a valid phone number'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password =
        'Password must contain uppercase, lowercase, and a number'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the terms and conditions'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    if (!validate()) return

    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      })
      navigate('/app/home', { replace: true })
    } catch {
      // error is set in the store
    }
  }

  function clearFieldError(field: keyof typeof validationErrors) {
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const inputClass = (hasError?: string) =>
    cn(
      'w-full rounded-lg border bg-[#141729] py-2.5 pl-10 pr-3 text-sm text-[#f0f2ff] placeholder-[#5a5f7a] transition-colors',
      'focus:border-[#6c5ce7] focus:outline-none focus:ring-1 focus:ring-[#6c5ce7]',
      hasError ? 'border-red-500/50' : 'border-[#2a2f4a]'
    )

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
            Create your account
          </h1>
          <p className="text-base text-[#8b8fa3]">
            Join Neighborly and start connecting with your community
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Server error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            {/* First Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="firstName"
                className="text-sm font-medium text-[#c0c3d6]"
              >
                First name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    clearFieldError('firstName')
                  }}
                  placeholder="John"
                  className={inputClass(validationErrors.firstName)}
                />
              </div>
              {validationErrors.firstName && (
                <p className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.firstName}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="lastName"
                className="text-sm font-medium text-[#c0c3d6]"
              >
                Last name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    clearFieldError('lastName')
                  }}
                  placeholder="Doe"
                  className={inputClass(validationErrors.lastName)}
                />
              </div>
              {validationErrors.lastName && (
                <p className="flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="reg-email"
              className="text-sm font-medium text-[#c0c3d6]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearFieldError('email')
                }}
                placeholder="you@example.com"
                className={inputClass(validationErrors.email)}
              />
            </div>
            {validationErrors.email && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-[#c0c3d6]"
            >
              Phone number{' '}
              <span className="text-[#5a5f7a]">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  clearFieldError('phone')
                }}
                placeholder="+1 (555) 123-4567"
                className={inputClass(validationErrors.phone)}
              />
            </div>
            {validationErrors.phone && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.phone}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="reg-password"
              className="text-sm font-medium text-[#c0c3d6]"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearFieldError('password')
                }}
                placeholder="Min. 8 characters"
                className={cn(
                  inputClass(validationErrors.password),
                  'pr-10'
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
            {/* Password strength indicator */}
            {password.length > 0 && !validationErrors.password && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[
                    password.length >= 8,
                    /[a-z]/.test(password) && /[A-Z]/.test(password),
                    /\d/.test(password),
                  ].map((met, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 w-8 rounded-full transition-colors',
                        met ? 'bg-[#6c5ce7]' : 'bg-[#2a2f4a]'
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[#5a5f7a]">
                  {password.length >= 8 &&
                  /[a-z]/.test(password) &&
                  /[A-Z]/.test(password) &&
                  /\d/.test(password)
                    ? 'Strong'
                    : 'Weak'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-[#c0c3d6]"
            >
              Confirm password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5f7a]" />
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearFieldError('confirmPassword')
                }}
                placeholder="Repeat your password"
                className={cn(
                  inputClass(validationErrors.confirmPassword),
                  'pr-10'
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a5f7a] transition-colors hover:text-[#c0c3d6]"
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.confirmPassword}
              </p>
            )}
            {/* Match indicator */}
            {confirmPassword.length > 0 &&
              password === confirmPassword && (
                <p className="flex items-center gap-1 text-xs text-green-400">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
          </div>

          {/* Terms */}
          <div className="space-y-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked)
                  clearFieldError('terms')
                }}
                className="mt-0.5 h-4 w-4 rounded border-[#2a2f4a] bg-[#141729] text-[#6c5ce7] focus:ring-[#6c5ce7] focus:ring-offset-0"
              />
              <span className="text-sm text-[#8b8fa3]">
                I agree to the{' '}
                <Link
                  to="/terms"
                  className="font-medium text-[#6c5ce7] transition-colors hover:text-[#5a4bd1]"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  className="font-medium text-[#6c5ce7] transition-colors hover:text-[#5a4bd1]"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
            {validationErrors.terms && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.terms}
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
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Create account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-[#8b8fa3]">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="font-medium text-[#6c5ce7] transition-colors hover:text-[#5a4bd1]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
