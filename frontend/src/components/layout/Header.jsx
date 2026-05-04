import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../api/endpoints'
import { Heart, Bell, LogOut, User, Menu, X, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Стрічка', auth: false },
  { to: '/quick-help', label: 'Швидка допомога', auth: false },
  { to: '/diary', label: 'Щоденник', auth: true },
  { to: '/chat', label: 'AI-помічник', auth: true },
  { to: '/my-posts', label: 'Мої звернення', auth: true },
]

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    enabled: !!user,
    refetchInterval: 60_000,
  })

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const visibleItems = navItems.filter((i) => !i.auth || user)

  return (
    <header className="sticky top-0 z-40 bg-cream-50/95 backdrop-blur-md border-b border-cream-200">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-sage-500 flex items-center justify-center group-hover:bg-sage-600 transition-colors">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-lg text-sage-800 hidden sm:block">
              ПсиДопомога
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sage-100 text-sage-800'
                      : 'text-sage-600 hover:bg-sage-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="relative p-2 text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                  title="Сповіщення"
                >
                  <Bell className="w-5 h-5" />
                  {unread?.count > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-warm-400 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                      {unread.count > 9 ? '9+' : unread.count}
                    </span>
                  )}
                </Link>

                {user.role === 'moderator' && (
                  <Link
                    to="/moderation"
                    className="p-2 text-accent-500 hover:bg-accent-50 rounded-lg transition-colors"
                    title="Модерація"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sage-700 hover:bg-sage-50 transition-colors text-sm font-medium"
                >
                  <User className="w-4 h-4" />
                  {user.nickname}
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-sage-500 hover:bg-sage-50 rounded-lg transition-colors"
                  title="Вийти"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden sm:inline-flex">
                  Увійти
                </Link>
                <Link to="/register" className="btn-primary">
                  Реєстрація
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 text-sage-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden py-3 border-t border-cream-200 flex flex-col gap-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-sage-100 text-sage-800'
                      : 'text-sage-600 hover:bg-sage-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
