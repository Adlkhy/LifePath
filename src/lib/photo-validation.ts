export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export async function validatePhoto(file: File): Promise<'jpg' | 'png' | 'webp'> {
  if (!file.size || file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo between 1 byte and 5 MB.')
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = [137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  if (file.type === 'image/jpeg' && jpeg) return 'jpg'
  if (file.type === 'image/png' && png) return 'png'
  if (file.type === 'image/webp' && webp) return 'webp'
  throw new Error('Choose a valid JPEG, PNG, or WebP photo. SVG and other formats are not supported.')
}
