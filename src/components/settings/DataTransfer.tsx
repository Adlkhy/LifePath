import { useRef, useState } from 'react'
import { useMutation } from '../../hooks/use-mutation'
import { useLifeData } from '../../hooks/use-life-data'
import { transferRepository } from '../../repositories/transfer.repository'
import { backupKinds, MAX_BACKUP_BYTES, validateBackup, type Backup } from '../../lib/backup'
import { errorMessage } from '../../lib/data-error'
import { label } from '../../lib/lifepath'
import { Button } from '../ui/button'
import { Field, Input } from '../ui/form-controls'
import { ConfirmDialog } from '../shared/ConfirmDialog'

export function DataTransfer() {
  const { refresh } = useLifeData()
  const mutation = useMutation()
  const [preview, setPreview] = useState<Backup | null>(null)
  const [validation, setValidation] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const selection = useRef(0)
  async function exportData() {
    await mutation.run(async () => {
      const backup = await transferRepository.export()
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `lifepath-${new Date().toISOString().slice(0, 10)}.json`; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'JSON backup downloaded. Remember to back up photos separately.')
  }
  async function choose(file?: File) {
    const version = ++selection.current
    setPreview(null); setValidation(null); setReading(!!file)
    if (!file) return
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Backups must be no larger than 10 MB.')
      const backup = validateBackup(JSON.parse(await file.text()))
      if (selection.current === version) setPreview(backup)
    } catch (cause) { if (selection.current === version) setValidation(errorMessage(cause)) }
    finally { if (selection.current === version) setReading(false) }
  }
  async function importData() {
    if (!preview) return
    if (await mutation.run(() => transferRepository.import(preview), 'Backup imported. Photo files must be restored separately.')) {
      setPreview(null); setConfirm(false); if (fileInput.current) fileInput.current.value = ''; refresh()
    }
  }
  return <section className="space-y-4 rounded-lg border p-4" aria-labelledby="transfer-heading"><h2 id="transfer-heading" className="text-xl font-semibold">Your data</h2><p className="text-sm text-muted-foreground">JSON includes chapters, goals, connections, memories, and history. Photo files are not included. Download each photo from its memory page or keep a separate Storage backup.</p>
    <Button variant="outline" disabled={mutation.busy} onClick={() => void exportData()}>Export JSON</Button>
    <Field id="import-file" label="Import a Lifepath JSON backup"><Input ref={fileInput} id="import-file" type="file" accept=".json,application/json" disabled={mutation.busy} onChange={(e) => void choose(e.target.files?.[0])} /></Field>
    {reading && <p role="status">Validating backup…</p>}
    {(validation || mutation.error) && <p role="alert" className="text-destructive">{validation || mutation.error}</p>}
    {preview && <div className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Import preview</h3><p className="text-sm">Exported {new Date(preview.exported_at).toLocaleString()} · Schema {preview.schema_version}</p><ul className="grid grid-cols-2 gap-2 text-sm">{backupKinds.map((kind) => <li key={kind}>{label(kind)}: {preview[kind].length}</li>)}</ul>
      <p className="text-sm">{preview.memories.filter((memory) => memory.has_photo).length} photo attachments need a separate backup. Photos will not be restored by this import.</p>
      <ul className="list-inside list-disc text-sm">{[...preview.chapters, ...preview.goals, ...preview.memories].slice(0, 5).map((record, index) => <li className="wrap-break-word" key={`${record.id}:${index}`}>{record.title}</li>)}</ul>
      <p className="text-sm">This adds records with new IDs in one database transaction. It does not overwrite existing data. Backups overlapping existing records or previous imports are rejected.</p><Button disabled={mutation.busy || reading} onClick={() => setConfirm(true)}>Review & import</Button>
    </div>}
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Import this backup?" description="Add the previewed records to your account? Existing records will remain unchanged. Photo files must be backed up and attached separately." confirmLabel="Confirm import" busy={mutation.busy} onConfirm={() => void importData()}>{mutation.error && <p role="alert" className="text-destructive">{mutation.error}</p>}</ConfirmDialog>
  </section>
}
