import { Button } from '../ui/button'
export function ResourceState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (loading) return <p role="status">Loading…</p>
  if (error) return <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" onClick={retry}>Try again</Button></div>
  return null
}
