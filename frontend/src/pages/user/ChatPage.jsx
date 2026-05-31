import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Sparkles, Plus, MessageCircle, AlertTriangle } from 'lucide-react'
import { chatApi } from '../../api/endpoints'
import { Spinner, EmptyState } from '../../components/ui/Common'
import { toast } from '../../hooks/useToast'
import { formatRelative, getApiError } from '../../utils/format'

function MessageBubble({ role, message }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-sage-500 text-white rounded-br-sm'
            : 'bg-white border border-cream-200 text-sage-800 rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 text-xs text-sage-500 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI-помічник
          </div>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

function ConversationsList({ conversations, currentId, onSelect, onNew }) {
  return (
    <aside className="card-flat sm:max-w-xs sm:w-72 flex-shrink-0">
      <button onClick={onNew} className="btn-primary w-full mb-3">
        <Plus className="w-4 h-4" /> Нова розмова
      </button>

      <div className="space-y-1 max-h-96 sm:max-h-[600px] overflow-y-auto">
        {conversations?.length === 0 && (
          <p className="text-sm text-sage-400 text-center py-4">Розмов немає</p>
        )}
        {conversations?.map((c) => (
          <button
            key={c.conversation_id}
            onClick={() => onSelect(c.conversation_id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              currentId === c.conversation_id
                ? 'bg-sage-100 text-sage-800'
                : 'hover:bg-cream-50 text-sage-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">Розмова</span>
            </div>
            <p className="text-xs text-sage-400 truncate">
              {c.messages_count} повід. · {formatRelative(c.last_message_at)}
            </p>
          </button>
        ))}
      </div>
    </aside>
  )
}

export function ChatPage() {
  const queryClient = useQueryClient()
  const [conversationId, setConversationId] = useState(null)
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState([])
  const scrollRef = useRef(null)

  const { data: convs } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatApi.conversations,
  })

  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ['chat', conversationId],
    queryFn: () => chatApi.messages(conversationId),
    enabled: !!conversationId,
  })

  const send = useMutation({
    mutationFn: chatApi.send,
    onMutate: (variables) => {
      // Одразу показуємо повідомлення юзера локально
      setLocalMessages((prev) => [
        ...prev,
        { id: 'optimistic', role: 'user', message: variables.message },
      ])
    },
    onSuccess: (data) => {
      setInput('')
      // Очищаємо локальні — тепер є реальні з бекенду
      setLocalMessages([])
      queryClient.setQueryData(['chat', data.conversation_id], (old) => ({
        items: [...(old?.items || []), ...data.messages],
      }))
      setConversationId(data.conversation_id)
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
    onError: (err) => {
      setLocalMessages([])
      const status = err?.response?.status
      const message = err?.response?.data?.error

      if (status === 429) {
        toast.error('Денний ліміт запитів вичерпано. Спробуйте завтра.')
      } else if (status === 503 || status === 502) {
        toast.error('AI-сервіс тимчасово недоступний. Спробуйте за кілька хвилин.')
      } else if (message) {
        toast.error(message)
      } else {
        toast.error('Не вдалось надіслати повідомлення.')
      }
    },
  })

  // Скидаємо локальні повідомлення при зміні розмови
  useEffect(() => {
    setLocalMessages([])
  }, [conversationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, localMessages, send.isPending])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || send.isPending) return
    send.mutate({ conversation_id: conversationId || undefined, message: input.trim() })
  }

  const items = messages?.items || []

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-sage-900 mb-2">
          AI-помічник
        </h1>
        <p className="text-sage-600">
          Поговоріть про те, що вас турбує. Я тут, щоб слухати й підтримати.
        </p>
      </div>

      <div className="card-flat bg-cream-50 border-cream-200 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-sage-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sage-800 mb-1">
              Хто такий AI-помічник?
            </p>
            <p className="text-sm text-sage-600 leading-relaxed">
              Це простір де можна виговоритись і бути почутим. Помічник виступає у ролі уважного співрозмовника — він не ставить діагнозів і не замінює психологічну допомогу. Просто хтось, хто слухає.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 pt-3 border-t border-cream-200">
          <AlertTriangle className="w-4 h-4 text-warm-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-sage-500">
            Якщо вам зараз дуже погано — зателефонуйте на безкоштовну лінію психологічної підтримки{' '}
            <strong className="text-sage-700">0 800 100 102</strong> або Lifeline{' '}
            <strong className="text-sage-700">7333</strong>.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <ConversationsList
          conversations={convs?.items}
          currentId={conversationId}
          onSelect={setConversationId}
          onNew={() => { setConversationId(null); setLocalMessages([]) }}
        />

        <main className="flex-1 card flex flex-col h-[600px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {!conversationId && items.length === 0 && localMessages.length === 0 && !send.isPending && (
              <EmptyState
                icon={Sparkles}
                title="Розкажіть, що вас турбує"
                description="AI-помічник відповість з турботою та запропонує практичні поради"
              />
            )}

            {msgsLoading && conversationId && <Spinner className="w-6 h-6 mx-auto" />}

            {/* Реальні повідомлення з бекенду */}
            {items.map((m) => (
              <MessageBubble key={m.id} role={m.role} message={m.message} />
            ))}

            {/* Локальні optimistic повідомлення */}
            {localMessages.map((m) => (
              <MessageBubble key={m.id} role={m.role} message={m.message} />
            ))}

            {/* Індикатор очікування відповіді AI */}
            {send.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-cream-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sage-400 animate-pulse" />
                  <span className="text-sm text-sage-500">друкую...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 pt-3 border-t border-cream-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Напишіть повідомлення..."
              disabled={send.isPending}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={!input.trim() || send.isPending}
              className="btn-primary px-4"
            >
              {send.isPending ? <Spinner /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}