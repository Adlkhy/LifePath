export function GoalProgress({ completed, total, label }: { completed: number; total: number; label: string }) {
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
    <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${total ? completed / total * 100 : 0}%` }} />
  </div>
}
