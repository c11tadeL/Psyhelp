import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, Users, FileText, AlertTriangle, Trash2, X, AlertOctagon,
} from 'lucide-react'
import { moderationApi } from '../../api/endpoints'
import { Spinner, PageLoader, EmptyState, Modal } from '../../components/ui/Common'
import { toast } from '../../hooks/useToast'
import { formatRelative, getApiError } from '../../utils/format'

const REASON_LABELS = {
  offensive: 'Образливий контент',
  spam: 'Спам',
  threat: 'Загрозливий вміст',
  self_harm: 'Заклики до самоушкодження',
  misinformation: 'Дезінформація',
  other: 'Інше',
}

function StatCard({ icon: Icon, label, value, color = 'sage' }) {
  return (
    <div className="card-flat">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-sage-500">{label}</p>
      </div>
      <p className="text-3xl font-display font-bold text-sage-900">{value}</p>
    </div>
  )
}

function ResolveModal({ complaint, onClose }) {
  const queryClient = useQueryClient()
  const [warningReason, setWarningReason] = useState('')

  const resolve = useMutation({
    mutationFn: ({ id, action, warning_reason }) =>
      moderationApi.resolve(id, { action, warning_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] })
      toast.success('Скаргу оброблено')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  if (!complaint) return null

  return (
    <Modal open onClose={onClose} title="Розгляд скарги" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-sage-400 text-xs">Тип контенту</p>
            <p className="font-medium text-sage-800">
              {complaint.content_type === 'post' ? 'Звернення' : 'Коментар'}
            </p>
          </div>
          <div>
            <p className="text-sage-400 text-xs">Подано</p>
            <p className="font-medium text-sage-800">
              {formatRelative(complaint.created_at)}
            </p>
          </div>
          <div>
            <p className="text-sage-400 text-xs">Скаржник</p>
            <p className="font-medium text-sage-800">@{complaint.reporter_nickname}</p>
          </div>
          <div>
            <p className="text-sage-400 text-xs">Причина</p>
            <p className="font-medium text-sage-800">{REASON_LABELS[complaint.reason]}</p>
          </div>
        </div>

        {complaint.comment && (
          <div>
            <p className="text-sage-400 text-xs mb-1">Уточнення скаржника</p>
            <p className="text-sage-700 italic">«{complaint.comment}»</p>
          </div>
        )}

        <div>
          <p className="text-sage-400 text-xs mb-1">Превʼю контенту</p>
          <div className="card-flat bg-warm-50 border-warm-200">
            <p className="text-sage-800 whitespace-pre-wrap">
              {complaint.target_preview || '(контент видалено або недоступний)'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">
            Причина попередження автору (опційно)
          </label>
          <textarea
            value={warningReason}
            onChange={(e) => setWarningReason(e.target.value)}
            maxLength={500}
            placeholder="Деталі для попередження..."
            className="textarea min-h-[60px]"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-cream-100">
          <button
            onClick={() =>
              resolve.mutate({ id: complaint.id, action: 'reject' })
            }
            disabled={resolve.isPending}
            className="btn-ghost flex-1"
          >
            <X className="w-4 h-4" /> Відхилити скаргу
          </button>
          <button
            onClick={() =>
              resolve.mutate({
                id: complaint.id,
                action: 'warn_user',
                warning_reason: warningReason || undefined,
              })
            }
            disabled={resolve.isPending}
            className="btn-secondary flex-1"
          >
            <AlertOctagon className="w-4 h-4" /> Винести попередження
          </button>
          <button
            onClick={() =>
              resolve.mutate({ id: complaint.id, action: 'delete_content' })
            }
            disabled={resolve.isPending}
            className="btn-danger flex-1"
          >
            <Trash2 className="w-4 h-4" /> Видалити контент
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function ModerationPage() {
  const [activeTab, setActiveTab] = useState('open')
  const [selected, setSelected] = useState(null)

  const { data: dashboard } = useQuery({
    queryKey: ['moderation', 'dashboard'],
    queryFn: moderationApi.dashboard,
  })

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['moderation', 'complaints', activeTab],
    queryFn: () => moderationApi.complaints({ status: activeTab }),
  })

  return (
    <div className="container-app py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent-100 text-accent-500">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-sage-900">
            Панель модерації
          </h1>
          <p className="text-sage-600">Скарги, статистика, аудит</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="Користувачів" value={dashboard?.stats?.users_total ?? '—'} />
        <StatCard
          icon={Users}
          label="Нових за 24г"
          value={dashboard?.stats?.users_new_24h ?? '—'}
          color="sage"
        />
        <StatCard
          icon={FileText}
          label="Звернень"
          value={dashboard?.stats?.posts_total ?? '—'}
        />
        <StatCard
          icon={FileText}
          label="Нових за 24г"
          value={dashboard?.stats?.posts_new_24h ?? '—'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Відкритих скарг"
          value={dashboard?.stats?.complaints_open ?? '—'}
          color="warm"
        />
      </div>

      <div className="flex gap-2 mb-4">
        {['open', 'resolved', 'rejected'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === t
                ? 'bg-sage-500 text-white'
                : 'bg-white border border-cream-300 text-sage-600'
            }`}
          >
            {t === 'open' && 'Відкриті'}
            {t === 'resolved' && 'Оброблені'}
            {t === 'rejected' && 'Відхилені'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : complaints?.items?.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Скарг немає"
          description={
            activeTab === 'open'
              ? 'Усі скарги розглянуто. Гарна робота!'
              : 'Тут буде історія оброблених скарг'
          }
        />
      ) : (
        <div className="space-y-3">
          {complaints?.items?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="card w-full text-left"
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-2">
                  <span className="badge-warm">{REASON_LABELS[c.reason]}</span>
                  <span className="badge-sage">
                    {c.content_type === 'post' ? 'Звернення' : 'Коментар'}
                  </span>
                </div>
                <span className="text-xs text-sage-400">
                  {formatRelative(c.created_at)}
                </span>
              </div>
              <p className="text-sm text-sage-800 line-clamp-2 mb-2">
                {c.target_preview || '(превʼю недоступне)'}
              </p>
              <p className="text-xs text-sage-500">
                Від @{c.reporter_nickname}
                {c.comment && ` · «${c.comment.slice(0, 80)}${c.comment.length > 80 ? '…' : ''}»`}
              </p>
            </button>
          ))}
        </div>
      )}

      <ResolveModal complaint={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
