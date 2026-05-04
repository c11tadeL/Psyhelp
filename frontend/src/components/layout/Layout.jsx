import { Heart } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { PageLoader } from '../ui/Common'

export function Footer() {
  return (
    <footer className="border-t border-cream-200 bg-cream-100/50 mt-12">
      <div className="container-app py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-sage-600">
        <p className="flex items-center gap-2">
          Зроблено з <Heart className="w-4 h-4 text-warm-400 fill-current" /> для турботи про ментальне здоров'я
        </p>
        <p className="text-xs">
          Платформа не замінює професійну психологічну допомогу
        </p>
      </div>
    </footer>
  )
}

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}
