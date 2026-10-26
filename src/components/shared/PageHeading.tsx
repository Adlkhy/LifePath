import type { ReactNode } from 'react'

export function PageHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <header className="page-heading"><div className="min-w-0"><div className="flex items-center gap-4"><h1 className="min-w-0 wrap-break-word">{title}</h1></div>{description && <p className="text-muted-foreground">{description}</p>}</div>{children}</header>
}
