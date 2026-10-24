import type { ReactNode } from 'react'

export function PageHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 space-y-2"><h1 className="wrap-break-word text-2xl font-semibold">{title}</h1>{description && <p className="text-muted-foreground">{description}</p>}</div>{children}</header>
}
