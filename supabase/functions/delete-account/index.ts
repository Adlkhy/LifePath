import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { handleDeleteAccount } from './handler.ts'

// Server runtime secrets only. Nothing in this folder is imported by the Vite app.
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
Deno.serve((request: Request) => handleDeleteAccount(request, {
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  async getUser(token) {
    const { data, error } = await admin.auth.getUser(token)
    return error ? null : data.user?.id ?? null
  },
  async removePhotos(userId) {
    const bucket = admin.storage.from('memory-photos')
    // Always delete offset zero: deleting a page changes subsequent offsets.
    for (let batch = 0; batch < 1000; batch++) {
      const { data, error } = await bucket.list(userId, { limit: 100 })
      if (error) throw error
      if (!data.length) return
      if (data.some((item) => !item.id)) throw new Error('Unexpected nested photo directory')
      const result = await bucket.remove(data.map((item) => `${userId}/${item.name}`))
      if (result.error) throw result.error
    }
    throw new Error('Photo cleanup exceeded batch limit; retry')
  },
  async deleteUser(userId) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw error
  },
}))
