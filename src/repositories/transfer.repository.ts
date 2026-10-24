import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/data-error'
import { backupSchema, type Backup } from '../lib/backup'
import type { Json } from '../types/database'
export const transferRepository = {
  async export() { return backupSchema.parse(unwrap('Export data', await supabase.rpc('export_lifepath'))) },
  async import(backup: Backup) { return unwrap('Import data', await supabase.rpc('import_lifepath', { payload: backup as unknown as Json })) },
}
