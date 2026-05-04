import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer, ProtectedRoute } from './components/layout/Layout'
import { ToastViewer } from './components/ui/ToastViewer'
import { useAuthStore } from './hooks/useAuth'
import { PageLoader } from './components/ui/Common'

import { LoginPage, RegisterPage } from './pages/auth/AuthPages'
import { HomePage } from './pages/user/HomePage'
import { PostDetailPage, NewPostPage, MyPostsPage } from './pages/user/PostPages'
import { DiaryPage } from './pages/user/DiaryPage'
import { ChatPage } from './pages/user/ChatPage'
import { QuickHelpPage } from './pages/user/QuickHelpPage'
import { NotificationsPage, ProfilePage } from './pages/user/AccountPages'
import { ModerationPage } from './pages/moderator/ModerationPage'

function NotFound() {
  return (
    <div className="container-app py-20 text-center">
      <h1 className="text-4xl font-display font-bold text-sage-900 mb-2">404</h1>
      <p className="text-sage-600">Сторінку не знайдено</p>
    </div>
  )
}

function MainLayout({ children }) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  const { init, loading } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <PageLoader />
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/*"
          element={
            <MainLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/quick-help" element={<QuickHelpPage />} />
                <Route path="/posts/new" element={
                  <ProtectedRoute><NewPostPage /></ProtectedRoute>
                } />
                <Route path="/posts/:id" element={<PostDetailPage />} />
                <Route path="/my-posts" element={
                  <ProtectedRoute><MyPostsPage /></ProtectedRoute>
                } />
                <Route path="/diary" element={
                  <ProtectedRoute><DiaryPage /></ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute><ChatPage /></ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute><NotificationsPage /></ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute><ProfilePage /></ProtectedRoute>
                } />
                <Route path="/moderation" element={
                  <ProtectedRoute role="moderator"><ModerationPage /></ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>
      <ToastViewer />
    </>
  )
}
