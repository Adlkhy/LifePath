import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { AuthForm } from './components/auth/AuthForm'
import { FeedbackProvider } from './components/shared/FeedbackProvider'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { HomePage } from './pages/HomePage'

const AppLayout = lazy(() => import('./components/layout/AppLayout').then((module) => ({ default: module.AppLayout })))
const FocusPage = lazy(() => import('./pages/FocusPage').then((module) => ({ default: module.FocusPage })))
const ValuesPage = lazy(() => import('./pages/ValuesPage').then((module) => ({ default: module.ValuesPage })))
const BucketListPage = lazy(() => import('./pages/BucketListPage').then((module) => ({ default: module.BucketListPage })))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then((module) => ({ default: module.ReviewsPage })))
const ChaptersPage = lazy(() => import('./pages/ChaptersPage').then((module) => ({ default: module.ChaptersPage })))
const ChapterEditorPage = lazy(() => import('./pages/ChapterEditorPage').then((module) => ({ default: module.ChapterEditorPage })))
const ChapterDetailPage = lazy(() => import('./pages/ChapterDetailPage').then((module) => ({ default: module.ChapterDetailPage })))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((module) => ({ default: module.GoalsPage })))
const GoalEditorPage = lazy(() => import('./pages/GoalEditorPage').then((module) => ({ default: module.GoalEditorPage })))
const GoalDetailPage = lazy(() => import('./pages/GoalDetailPage').then((module) => ({ default: module.GoalDetailPage })))
const JourneyPage = lazy(() => import('./pages/JourneyPage').then((module) => ({ default: module.JourneyPage })))
const LifeMapPage = lazy(() => import('./pages/LifeMapPage').then((module) => ({ default: module.LifeMapPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })))
const MemoryEditorPage = lazy(() => import('./pages/MemoryEditorPage').then((module) => ({ default: module.MemoryEditorPage })))
const MemoryDetailPage = lazy(() => import('./pages/MemoryDetailPage').then((module) => ({ default: module.MemoryDetailPage })))
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((module) => ({ default: module.EventDetailPage })))

function RouteScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <RouteScrollReset />
      <AuthProvider>
        <FeedbackProvider>
        <Suspense fallback={<p role="status" className="p-6">Loading page…</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<AuthForm key="sign-in" mode="sign-in" />} />
          <Route path="/sign-up" element={<AuthForm key="sign-up" mode="sign-up" />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<FocusPage />} />
              <Route path="values" element={<ValuesPage />} />
              <Route path="bucket-list" element={<BucketListPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="chapters" element={<ChaptersPage />} />
              <Route path="chapters/new" element={<ChapterEditorPage />} />
              <Route path="chapters/:id" element={<ChapterDetailPage />} />
              <Route path="chapters/:id/edit" element={<ChapterEditorPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="goals/new" element={<GoalEditorPage />} />
              <Route path="goals/:id" element={<GoalDetailPage />} />
              <Route path="goals/:id/edit" element={<GoalEditorPage />} />
              <Route path="journey" element={<JourneyPage />} />
              <Route path="journey/:id" element={<EventDetailPage />} />
              <Route path="memories/new" element={<MemoryEditorPage />} />
              <Route path="memories/:id" element={<MemoryDetailPage />} />
              <Route path="memories/:id/edit" element={<MemoryEditorPage />} />
              <Route path="map" element={<LifeMapPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>
          <Route path="*" element={<main className="p-6"><h1>Page not found</h1><Link className="underline" to="/">Back home</Link></main>} />
        </Routes>
        </Suspense>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
