export class DataError extends Error {
  readonly code: string | undefined

  constructor(operation: string, error: { message: string; code?: string }) {
    super(`${operation}: ${error.message}`, { cause: error })
    this.name = 'DataError'
    this.code = error.code
  }
}

export function unwrap<T>(operation: string, result: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (result.error) throw new DataError(operation, result.error)
  if (result.data == null) throw new DataError(operation, { message: 'Record not found or access denied.', code: 'NOT_FOUND' })
  return result.data
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
