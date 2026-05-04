import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Flag, MessageCircle, Trash2 } from 'lucide-react'
import { categoriesApi, postsApi, commentsApi } from '../../api/endpoints'
import { useAuthStore } from '../../hooks/useAuth'
import { ReportModal } from '../../components/posts/ReportModal'
import { Spinner, PageLoader, Confirm } from '../../components/ui/Common'
import { toast } from '../../hooks/useToast'
import { formatRelative, getApiError } from '../../utils/format'

export function PostDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [comment, setComment] = useState('')
  const [reportTarget, setReportTarget] = useState(null)

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id),
  })

  const addComment = useMutation({
    mutationFn: (body) => commentsApi.create(id, { body }),
    onSuccess: () => {
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success('Коментар надіслано')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  if (isLoading) return <PageLoader />
  if (!post) return null

  return (
    <div className="container-app py-8 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sage-600 hover:text-sage-800 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> До стрічки
      </Link>

      <article className="card mb-8">
        <div className="flex items-center justify-between mb-4 gap-2">
          <span className="badge-sage">{post.category_name}</span>
          <span className="text-xs text-sage-400">{formatRelative(post.created_at)}</span>
        </div>

        <p className="text-sage-800 whitespace-pre-wrap leading-relaxed text-lg mb-6">
          {post.body}
        </p>

        <div className="flex items-center justify-between text-sm text-sage-500 pt-4 border-t border-cream-100">
          <span className="font-mono text-sage-400">@{post.author_nickname}</span>
          {user && user.nickname !== post.author_nickname && (
            <button
              onClick={() => setReportTarget({ type: 'post', id: post.id })}
              className="text-sage-400 hover:text-warm-400 transition-colors flex items-center gap-1"
            >
              <Flag className="w-4 h-4" /> Поскаржитись
            </button>
          )}
        </div>
      </article>

      <section>
        <h2 className="font-display font-semibold text-xl text-sage-800 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Коментарі підтримки ({post.comments?.length || 0})
        </h2>

        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (comment.trim()) addComment.mutate(comment.trim())
            }}
            className="card mb-4"
          >
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Поділіться словами підтримки..."
              maxLength={2000}
              className="textarea border-0 p-0 focus:ring-0"
              rows={3}
            />
            <div className="flex justify-end mt-2 pt-2 border-t border-cream-100">
              <button
                type="submit"
                disabled={!comment.trim() || addComment.isPending}
                className="btn-primary"
              >
                {addComment.isPending ? <Spinner /> : <><Send className="w-4 h-4" /> Надіслати</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="card-flat text-center text-sage-600 mb-4">
            <Link to="/login" className="text-sage-700 font-semibold underline">Увійдіть</Link>, щоб залишити коментар
          </div>
        )}

        <div className="space-y-3">
          {post.comments?.map((c) => (
            <div key={c.id} className="card-flat">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-mono text-sage-500">@{c.nickname}</span>
                <span className="text-xs text-sage-400">{formatRelative(c.created_at)}</span>
              </div>
              <p className="text-sage-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType={reportTarget?.type}
        contentId={reportTarget?.id}
      />
    </div>
  )
}

export function NewPostPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  const create = useMutation({
    mutationFn: postsApi.create,
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Звернення опубліковано')
      navigate(`/posts/${post.id}`)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <div className="container-app py-8 max-w-2xl">
      <h1 className="text-3xl font-display font-bold text-sage-900 mb-2">
        Нове звернення
      </h1>
      <p className="text-sage-600 mb-6">
        Поділіться тим, що вас хвилює. Спільнота прочитає й підтримає вас.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate({ category_id: Number(categoryId), body })
        }}
        className="card space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Категорія</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            <option value="">Оберіть категорію</option>
            {categories?.items?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1.5">Ваше звернення</label>
          <textarea
            required
            minLength={10}
            maxLength={5000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Опишіть, що вас хвилює, які думки чи відчуття переживаєте..."
            className="textarea min-h-[200px]"
          />
          <p className="text-xs text-sage-400 mt-1 text-right">
            {body.length} / 5000
          </p>
        </div>

        <div className="flex justify-between gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Скасувати
          </button>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? <Spinner /> : 'Опублікувати'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function MyPostsPage() {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['posts', 'mine'],
    queryFn: postsApi.myList,
  })

  const remove = useMutation({
    mutationFn: postsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Звернення видалено')
    },
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="container-app py-8 max-w-3xl">
      <h1 className="text-3xl font-display font-bold text-sage-900 mb-6">
        Мої звернення
      </h1>

      {data?.items?.length === 0 ? (
        <p className="text-sage-500 text-center py-12">У вас ще немає звернень</p>
      ) : (
        <div className="space-y-4">
          {data?.items?.map((post) => (
            <article key={post.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="badge-sage">{post.category_name}</span>
                <span className="text-xs text-sage-400">
                  {formatRelative(post.created_at)}
                </span>
              </div>
              <Link to={`/posts/${post.id}`} className="block mb-4">
                <p className="text-sage-800 line-clamp-3 hover:text-sage-600 transition-colors">
                  {post.body}
                </p>
              </Link>
              <div className="flex items-center justify-between pt-3 border-t border-cream-100">
                <span className="text-sm text-sage-500 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  {post.comments_count} {post.comments_count === 1 ? 'коментар' : 'коментарів'}
                </span>
                <button
                  onClick={() => setConfirmDelete(post.id)}
                  className="text-sage-400 hover:text-warm-400 flex items-center gap-1 text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Видалити
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Confirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove.mutate(confirmDelete)}
        title="Видалити звернення?"
        message="Звернення зникне зі стрічки. Цю дію неможливо скасувати."
        danger
      />
    </div>
  )
}
