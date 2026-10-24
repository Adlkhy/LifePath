import { useEffect, useState } from 'react'
import { photosService } from '../../services/photos.service'
import { errorMessage } from '../../lib/data-error'
import { Button } from '../ui/button'

export function MemoryPhoto({ path, title }: { path: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    let objectUrl: string | undefined
    void photosService.download(path).then((blob) => {
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); setError(null) }
    }).catch((cause: unknown) => { if (active) setError(errorMessage(cause)) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path, retry])
  if (error) return <div className="space-y-2"><p role="alert">{error}</p><Button variant="outline" onClick={() => { setUrl(null); setError(null); setRetry((value) => value + 1) }}>Retry photo</Button></div>
  if (!url) return <p role="status">Loading private photo…</p>
  return <figure className="space-y-2"><img src={url} alt={title} onError={() => setError('This photo could not be displayed. Try again or replace it from Edit memory.')} className="max-h-[65dvh] max-w-full rounded-lg object-contain" /><a className="text-sm underline" href={url} download={`lifepath-photo.${path.split('.').pop()}`}>Download photo for backup</a></figure>
}
