// Keep loading even when an API row cap is smaller than our requested page size.
export async function collectPages<T>(fetchPage: (offset: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const page = await fetchPage(rows.length)
    if (page.length === 0) return rows
    rows.push(...page)
  }
}
