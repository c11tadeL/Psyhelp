import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, MessageSquareHeart, ChevronLeft, ChevronRight } from 'lucide-react'
import { categoriesApi, postsApi } from '../../api/endpoints'
import { useAuthStore } from '../../hooks/useAuth'
import { PostCard, CategoryFilter, SortToggle } from '../../components/posts/PostCard'
import { ReportModal } from '../../components/posts/ReportModal'
import { Spinner, EmptyState } from '../../components/ui/Common'

const PAGE_SIZE = 9

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null

  const pages = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      {/* Стрілка назад */}
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-cream-200 text-sage-500 hover:bg-cream-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Попередня сторінка"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Номери сторінок */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-sage-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              current === page
                ? 'bg-sage-500 text-white shadow-gentle'
                : 'border border-cream-200 text-sage-700 hover:bg-cream-50'
            }`}
            aria-current={current === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Стрілка вперед */}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-cream-200 text-sage-500 hover:bg-cream-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Наступна сторінка"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export function HomePage() {
  const [category, setCategory] = useState(null)
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [reportTarget, setReportTarget] = useState(null)
  const { user } = useAuthStore()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { category, sort }],
    queryFn: () => postsApi.list({ category: category || undefined, sort, limit: 50 }),
  })

  const allPosts = data?.items || []

  const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagePosts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return allPosts.slice(start, start + PAGE_SIZE)
  }, [allPosts, currentPage])

  const handleCategoryChange = (val) => {
    setCategory(val)
    setPage(1)
  }
  const handleSortChange = (val) => {
    setSort(val)
    setPage(1)
  }

  const handlePageChange = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
            onChange={handleCategoryChange}
          />
          <SortToggle value={sort} onChange={handleSortChange} />
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8" />
        </div>
      ) : pagePosts.length ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-sage-500">
              Показано {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, allPosts.length)} з {allPosts.length} звернень
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-sage-400">
                Сторінка {currentPage} з {totalPages}
              </p>
            )}
          </div>

          {/* Сітка постів */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pagePosts.map((post) => (
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

          {/* Пагінація */}
          <Pagination
            current={currentPage}
            total={totalPages}
            onChange={handlePageChange}
          />
        </>
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
