export type Theme = 'light' | 'dark'

const storageKey = 'lifepath-theme'

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function initializeTheme() {
  try {
    applyTheme(localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light')
  } catch {
    applyTheme('light')
  }
}

export function saveTheme(theme: Theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // The toggle still works when browser storage is unavailable.
  }
}
