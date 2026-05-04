import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Heart, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../hooks/useAuth'
import { toast } from '../../hooks/useToast'
import { getApiError } from '../../utils/format'
import { Spinner } from '../../components/ui/Common'

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-cream-50 via-cream-100 to-sage-50">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sage-500 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <span className="font-display font-bold text-2xl text-sage-800">
            ПсиДопомога
          </span>
        </Link>

        <div className="card">
          <h1 className="text-2xl font-display font-bold text-sage-900 mb-2">
            {title}
          </h1>
          <p className="text-sage-500 text-sm mb-6">{subtitle}</p>
          {children}
        </div>

        <p className="text-center text-sm text-sage-600 mt-6">{footer}</p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login({ email, password })
      toast.success('Ласкаво просимо!')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="З поверненням"
      subtitle="Увійдіть, щоб продовжити роботу зі своїм щоденником і спільнотою"
      footer={
        <>
          Ще немає акаунта?{' '}
          <Link to="/register" className="text-sage-600 font-semibold hover:underline">
            Зареєструватися
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Пароль</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600"
            >
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner /> : 'Увійти'}
        </button>
      </form>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', nickname: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { register, login } = useAuthStore()
  const navigate = useNavigate()

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await register(form)
      await login({ email: form.email, password: form.password })
      toast.success('Акаунт створено! Ласкаво просимо.')
      navigate('/')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Створити акаунт"
      subtitle="Лише email, нікнейм і пароль. Жодних персональних даних."
      footer={
        <>
          Вже маєте акаунт?{' '}
          <Link to="/login" className="text-sage-600 font-semibold hover:underline">
            Увійти
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            className="input"
            placeholder="your@email.com"
          />
          <p className="text-xs text-sage-400 mt-1">Не публічний, потрібен лише для входу</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Нікнейм</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_]{3,32}"
            value={form.nickname}
            onChange={update('nickname')}
            className="input"
            placeholder="anonymous_42"
          />
          <p className="text-xs text-sage-400 mt-1">3-32 символи: латиниця, цифри, _</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Пароль</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              className="input pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600"
            >
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-sage-400 mt-1">Мінімум 8 символів</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner /> : 'Створити акаунт'}
        </button>
      </form>
    </AuthLayout>
  )
}
