import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, MessageSquareHeart } from 'lucide-react'
import { categoriesApi, postsApi } from '../../api/endpoints'
import { useAuthStore } from '../../hooks/useAuth'
import { PostCard, CategoryFilter, SortToggle } from '../../components/posts/PostCard'
import { ReportModal } from '../../components/posts/ReportModal'
import { Spinner, EmptyState } from '../../components/ui/Common'

export function HomePage() {
  const [category, setCategory] = useState(null)
  const [sort, setSort] = useState('recent')
  const [reportTarget, setReportTarget] = useState(null)
  const { user } = useAuthStore()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { category, sort }],
    queryFn: () => postsApi.list({ category: category || undefined, sort, limit: 20 }),
  })

  return (
    <div className="container-app py-8">
      <section className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-sage-900 mb-2">
              Спільнота підтримки
            </h1>
            <p className="text-sage-600">
              Анонімні звернення людей, які переживають схожі труднощі
            </p>
          </div>
          {user && (
            <Link to="/posts/new" className="btn-primary self-start">
              <Plus className="w-4 h-4" />
              Створити звернення
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <CategoryFilter
            categories={categories?.items}
            value={category}
            onChange={setCategory}
          />
          <SortToggle value={sort} onChange={setSort} />
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8" />
        </div>
      ) : data?.items?.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReport={
                user
                  ? () => setReportTarget({ type: 'post', id: post.id })
                  : null
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquareHeart}
          title="Поки що немає звернень"
          description={
            user
              ? 'Будьте першим — поділіться тим, що вас турбує. Спільнота підтримає.'
              : 'Зареєструйтесь, щоб створити перше звернення.'
          }
          action={
            user ? (
              <Link to="/posts/new" className="btn-primary">
                <Plus className="w-4 h-4" />
                Створити звернення
              </Link>
            ) : (
              <Link to="/register" className="btn-primary">
                Зареєструватися
              </Link>
            )
          }
        />
      )}

      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType={reportTarget?.type}
        contentId={reportTarget?.id}
      />
    </div>
  )
}
