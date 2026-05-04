import { Link } from 'react-router-dom'
import { MessageCircle, Flag, Clock, TrendingUp } from 'lucide-react'
import { formatRelative } from '../../utils/format'

const categoryColors = {
  anxiety: 'bg-accent-50 text-accent-500 border-accent-200',
  depression: 'bg-sage-50 text-sage-700 border-sage-200',
  relationships: 'bg-warm-50 text-warm-500 border-warm-200',
  'work-study': 'bg-cream-100 text-cream-500 border-cream-300',
  'self-esteem': 'bg-sage-50 text-sage-600 border-sage-200',
  grief: 'bg-cream-50 text-sage-700 border-cream-300',
  sleep: 'bg-accent-50 text-accent-500 border-accent-200',
  identity: 'bg-warm-50 text-warm-500 border-warm-200',
  other: 'bg-sage-50 text-sage-600 border-sage-200',
}

export function PostCard({ post, onReport }) {
  const colorClass = categoryColors[post.category_slug] || categoryColors.other

  return (
    <article className="card group">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className={`badge border ${colorClass}`}>
          {post.category_name}
        </span>
        <div className="flex items-center gap-2 text-xs text-sage-400">
          <Clock className="w-3.5 h-3.5" />
          {formatRelative(post.created_at)}
        </div>
      </div>

      <Link to={`/posts/${post.id}`} className="block">
        <p className="text-sage-800 line-clamp-4 mb-4 group-hover:text-sage-600 transition-colors leading-relaxed">
          {post.body}
        </p>
      </Link>

      <div className="flex items-center justify-between pt-4 border-t border-cream-100">
        <div className="flex items-center gap-4 text-sm text-sage-500">
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            {post.comments_count} {post.comments_count === 1 ? 'коментар' : 'коментарів'}
          </span>
          {post.rating_score > 0 && (
            <span className="flex items-center gap-1.5 text-sage-400">
              <TrendingUp className="w-4 h-4" />
              актуальне
            </span>
          )}
        </div>
        <span className="text-xs text-sage-400 font-mono">@{post.nickname}</span>
        {onReport && (
          <button
            onClick={() => onReport(post)}
            className="text-sage-300 hover:text-warm-400 transition-colors"
            title="Поскаржитись"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  )
}

export function CategoryFilter({ categories, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !value
            ? 'bg-sage-500 text-white'
            : 'bg-white border border-cream-300 text-sage-600 hover:bg-cream-50'
        }`}
      >
        Усі
      </button>
      {categories?.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === cat.id
              ? 'bg-sage-500 text-white'
              : 'bg-white border border-cream-300 text-sage-600 hover:bg-cream-50'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

export function SortToggle({ value, onChange }) {
  return (
    <div className="inline-flex bg-cream-100 rounded-lg p-1">
      <button
        onClick={() => onChange('recent')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          value === 'recent'
            ? 'bg-white text-sage-800 shadow-sm'
            : 'text-sage-500 hover:text-sage-700'
        }`}
      >
        Нові
      </button>
      <button
        onClick={() => onChange('rating')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          value === 'rating'
            ? 'bg-white text-sage-800 shadow-sm'
            : 'text-sage-500 hover:text-sage-700'
        }`}
      >
        Актуальні
      </button>
    </div>
  )
}
