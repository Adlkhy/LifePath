import { memoriesRepository, type MemoryInput } from '../repositories/memories.repository'
import { photosService } from './photos.service'
import { errorMessage } from '../lib/data-error'
import type { Memory } from '../types/database'

export const memoriesService = {
  async save(input: MemoryInput, userId: string, file: File | null, existing?: Memory) {
    const uploaded = file ? await photosService.upload(userId, file) : null
    let saved: Memory
    try {
      const values = { ...input, photo_path: uploaded ?? input.photo_path }
      saved = existing ? await memoriesRepository.update(existing.id, values) : await memoriesRepository.create(values)
    } catch (cause) {
      if (uploaded) {
        try { await photosService.remove([uploaded]) }
        catch { throw new Error(`${errorMessage(cause)} An unattached photo may remain; use photo cleanup in settings.`) }
      }
      throw cause
    }
    let warning: string | null = null
    if (existing?.photo_path && existing.photo_path !== saved.photo_path) {
      try { await photosService.remove([existing.photo_path]) }
      catch { warning = 'Memory saved. The previous photo could not be removed; use photo cleanup in settings.' }
    }
    return { saved, warning }
  },
  async remove(memory: Memory) {
    await memoriesRepository.remove(memory.id)
    if (memory.photo_path) {
      try { await photosService.remove([memory.photo_path]) }
      catch { return 'Memory deleted. Its photo could not be removed; use photo cleanup in settings.' }
    }
    return 'Memory deleted.'
  },
  async cleanupPhotos(userId: string) {
    const [memories, paths] = await Promise.all([memoriesRepository.listAll(), photosService.listOwn(userId)])
    const referenced = new Set(memories.map((memory) => memory.photo_path))
    const unused = paths.filter((path) => !referenced.has(path))
    for (let index = 0; index < unused.length; index += 100) await photosService.remove(unused.slice(index, index + 100))
    return unused.length
  },
}
