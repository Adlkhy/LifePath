import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { AuthForm } from './components/auth/AuthForm'
import { AccountPage } from './pages/AccountPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<AuthForm key="sign-in" mode="sign-in" />} />
          <Route path="/sign-up" element={<AuthForm key="sign-up" mode="sign-up" />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<main className="p-6"><h1>Page not found</h1><Link className="underline" to="/">Back home</Link></main>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
