import { supabase } from '../lib/supabase'
import { DataError } from '../lib/data-error'
import { validatePhoto } from '../lib/photo-validation'
const bucket = 'memory-photos'

export const photosService = {
  async upload(userId: string, file: File) {
    const extension = await validatePhoto(file)
    const path = `${userId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new DataError('Upload photo', error)
    return path
  },
  async download(path: string) {
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error) throw new DataError('Load private photo', error)
    return data
  },
  async remove(paths: string[]) {
    if (!paths.length) return
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) throw new DataError('Remove photo', error)
  },
  async listOwn(userId: string) {
    const paths: string[] = []
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new DataError('List private photos', error)
      paths.push(...data.filter((item) => item.id).map((item) => `${userId}/${item.name}`))
      if (data.length < 100) return paths
    }
  },
}
