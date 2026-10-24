interface ViteTypeOptions {
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_ENABLE_ACCOUNT_DELETION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
