import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, MessageCircle, AlertTriangle, Shield, User, LogOut } from 'lucide-react'
import { notificationsApi, meApi } from '../../api/endpoints'
import { useAuthStore } from '../../hooks/useAuth'
import { Spinner, EmptyState, PageLoader, Confirm } from '../../components/ui/Common'
import { toast } from '../../hooks/useToast'
import { formatRelative, getApiError } from '../../utils/format'
import { useState } from 'react'

const TYPE_INFO = {
  new_comment: { icon: MessageCircle, color: 'text-sage-500', label: 'Новий коментар' },
  warning: { icon: AlertTriangle, color: 'text-warm-500', label: 'Попередження' },
  content_removed: { icon: Shield, color: 'text-warm-400', label: 'Контент видалено' },
}

export function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  })

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    if (data?.items?.some((n) => !n.is_read)) {
      markRead.mutate()
    }
  }, [data])

  if (isLoading) return <PageLoader />

  return (
    <div className="container-app py-8 max-w-2xl">
      <h1 className="text-3xl font-display font-bold text-sage-900 mb-6">Сповіщення</h1>

      {data?.items?.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Сповіщень немає"
          description="Тут будуть появлятись повідомлення про коментарі до ваших звернень"
        />
      ) : (
        <div className="space-y-2">
          {data?.items?.map((n) => {
            const info = TYPE_INFO[n.type] || { icon: Bell, color: 'text-sage-500', label: n.type }
            const Icon = info.icon
            return (
              <div
                key={n.id}
                className={`card-flat flex items-start gap-3 ${
                  !n.is_read ? 'bg-sage-50 border-sage-200' : ''
                }`}
              >
                <div className={`p-2 rounded-lg bg-white ${info.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sage-800">{info.label}</p>
                  {n.payload?.reason && (
                    <p className="text-sm text-sage-600 mt-1">{n.payload.reason}</p>
                  )}
                  {n.post_id && (
                    <Link
                      to={`/posts/${n.post_id}`}
                      className="text-sm text-sage-600 hover:underline mt-1 inline-block"
                    >
                      Перейти до звернення →
                    </Link>
                  )}
                  <p className="text-xs text-sage-400 mt-1">{formatRelative(n.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, updateUser, logout } = useAuthStore()
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [confirmRevoke, setConfirmRevoke] = useState(null)

  const { data: sessions } = useQuery({
    queryKey: ['me', 'sessions'],
    queryFn: meApi.sessions,
  })

  const update = useMutation({
    mutationFn: meApi.update,
    onSuccess: (u) => {
      updateUser({ nickname: u.nickname })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Профіль оновлено')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const revokeSession = useMutation({
    mutationFn: meApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] })
      toast.success('Сесію відкликано')
    },
  })

  return (
    <div className="container-app py-8 max-w-2xl">
      <h1 className="text-3xl font-display font-bold text-sage-900 mb-6">Профіль</h1>

      <div className="card mb-5">
        <h2 className="font-display font-semibold text-lg text-sage-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" /> Основні дані
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (nickname !== user.nickname) update.mutate({ nickname })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-1.5">Нікнейм</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]{3,32}"
              className="input"
            />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-cream-100">
            <p className="text-sm text-sage-500">
              Роль: <span className="badge-sage ml-1">{user?.role === 'moderator' ? 'Модератор' : 'Користувач'}</span>
            </p>
            <button
              type="submit"
              disabled={nickname === user?.nickname || update.isPending}
              className="btn-primary"
            >
              {update.isPending ? <Spinner /> : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>

      <div className="card mb-5">
        <h2 className="font-display font-semibold text-lg text-sage-800 mb-4">Активні сесії</h2>
        <div className="space-y-2">
          {sessions?.items?.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-cream-50">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm text-sage-800 truncate">{s.user_agent || 'Unknown device'}</p>
                <p className="text-xs text-sage-400">
                  {s.ip_address} · {formatRelative(s.issued_at)}
                </p>
              </div>
              <button
                onClick={() => setConfirmRevoke(s.id)}
                className="text-sage-400 hover:text-warm-400 text-sm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ))}
          {sessions?.items?.length === 0 && (
            <p className="text-sage-400 text-sm text-center py-4">Немає активних сесій</p>
          )}
        </div>
      </div>

      <button onClick={logout} className="btn-danger w-full">
        <LogOut className="w-4 h-4" /> Вийти з акаунта
      </button>

      <Confirm
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={() => revokeSession.mutate(confirmRevoke)}
        title="Відкликати сесію?"
        message="Пристрій буде розлогінено через 15 хвилин"
        danger
      />
    </div>
  )
}
