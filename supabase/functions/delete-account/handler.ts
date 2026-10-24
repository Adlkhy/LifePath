export type DeletionServices = {
  allowedOrigins: string[]
  getUser: (token: string) => Promise<string | null>
  removePhotos: (userId: string) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
}
export async function handleDeleteAccount(request: Request, services: DeletionServices): Promise<Response> {
  const origin = request.headers.get('Origin')
  const headers = new Headers({ 'Content-Type': 'application/json', 'Vary': 'Origin', 'Cache-Control': 'no-store' })
  const reply = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers })
  if (origin && !services.allowedOrigins.includes(origin)) return reply(403, 'Origin not allowed')
  if (origin) headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info')
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return reply(405, 'Use POST')
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return reply(401, 'Sign in to delete your account')
  try {
    const userId = await services.getUser(token)
    if (!userId) return reply(401, 'Session is invalid or expired')
    const text = await request.text()
    if (text.length > 256) return reply(400, 'Invalid confirmation')
    let body: unknown
    try { body = JSON.parse(text) } catch { return reply(400, 'Invalid confirmation') }
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || !('confirmation' in body) || body.confirmation !== 'DELETE') return reply(400, 'Explicit confirmation is required')
    // The target always comes from the verified user token; never from request input.
    await services.removePhotos(userId)
    await services.deleteUser(userId)
    return new Response(JSON.stringify({ deleted: true }), { status: 200, headers })
  } catch {
    return reply(500, 'Account deletion could not finish. Some photos may already be removed. Please retry.')
  }
}
