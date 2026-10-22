import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { AuthForm } from './components/auth/AuthForm'
import { AccountPage } from './pages/AccountPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'

const AppLayout = lazy(() => import('./components/layout/AppLayout').then((module) => ({ default: module.AppLayout })))
const FocusPage = lazy(() => import('./pages/FocusPage').then((module) => ({ default: module.FocusPage })))
const ChaptersPage = lazy(() => import('./pages/ChaptersPage').then((module) => ({ default: module.ChaptersPage })))
const ChapterEditorPage = lazy(() => import('./pages/ChapterEditorPage').then((module) => ({ default: module.ChapterEditorPage })))
const ChapterDetailPage = lazy(() => import('./pages/ChapterDetailPage').then((module) => ({ default: module.ChapterDetailPage })))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((module) => ({ default: module.GoalsPage })))
const GoalEditorPage = lazy(() => import('./pages/GoalEditorPage').then((module) => ({ default: module.GoalEditorPage })))
const GoalDetailPage = lazy(() => import('./pages/GoalDetailPage').then((module) => ({ default: module.GoalDetailPage })))
const JourneyPage = lazy(() => import('./pages/JourneyPage').then((module) => ({ default: module.JourneyPage })))

function HomePage() {
  return (
    <>
      <section>
        <p>
        Hello
        </p>
      </section>
      <nav className="space-x-4 p-4" aria-label="Account">
        <Link className="underline" to="/sign-in">Sign in</Link>
        <Link className="underline" to="/app">My account</Link>
      </nav>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<p role="status" className="p-6">Loading page…</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<AuthForm key="sign-in" mode="sign-in" />} />
          <Route path="/sign-up" element={<AuthForm key="sign-up" mode="sign-up" />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<FocusPage />} />
              <Route path="chapters" element={<ChaptersPage />} />
              <Route path="chapters/new" element={<ChapterEditorPage />} />
              <Route path="chapters/:id" element={<ChapterDetailPage />} />
              <Route path="chapters/:id/edit" element={<ChapterEditorPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="goals/new" element={<GoalEditorPage />} />
              <Route path="goals/:id" element={<GoalDetailPage />} />
              <Route path="goals/:id/edit" element={<GoalEditorPage />} />
              <Route path="journey" element={<JourneyPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>
          <Route path="*" element={<main className="p-6"><h1>Page not found</h1><Link className="underline" to="/">Back home</Link></main>} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
