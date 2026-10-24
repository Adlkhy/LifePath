import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/data-error'

export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void load().then((data) => { if (active) setState({ data, loading: false, error: null }) })
      .catch((cause: unknown) => { if (active) setState({ data: null, loading: false, error: errorMessage(cause) }) })
    return () => { active = false }
  }, [load, revision])
  function reload() { setState({ data: null, loading: true, error: null }); setRevision((value) => value + 1) }
  return { ...state, reload }
}
