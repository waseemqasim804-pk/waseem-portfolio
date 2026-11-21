type SocialSignInButtonsProps = {
  disabled: boolean
  onGoogle: () => void
  onFacebook: () => void
  busy?: boolean
}

export default function SocialSignInButtons({ disabled, onGoogle, onFacebook, busy = false }: SocialSignInButtonsProps) {
  const buttonClass = 'inline-flex h-14 w-full items-center justify-center gap-4 rounded-full px-7 text-base font-semibold shadow-sm transition duration-200 hover:-translate-y-px hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:h-16'

  return (
    <div className="grid w-full gap-4">
      <button
        type="button"
        onClick={onGoogle}
        disabled={disabled}
        className={`${buttonClass} border border-border bg-surface text-foreground hover:bg-surface focus-visible:ring-orange-500 focus-visible:ring-offset-neutral-50 dark:border-border/80 dark:bg-background/20 dark:text-foreground dark:hover:bg-background/40 dark:focus-visible:ring-offset-[var(--bg)]`}
      >
        <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.6 33.1 29.8 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l6-6C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.2-17.7 10.7z" />
          <path fill="#34A853" d="M6.3 14.7 13.3 20c1.9-4.7 5.9-8 10.7-8 3.1 0 5.9 1.1 8 3l6-6C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.2-17.7 10.7z" />
          <path fill="#FBBC05" d="M24 44c5.4 0 10.2-2 13.7-5.4l-6.3-5.3c-2 1.7-4.5 2.7-7.4 2.7-5.8 0-10.6-3.9-12.1-9.1l-7.1 5.5C8.2 39.4 15.5 44 24 44z" />
          <path fill="#EA4335" d="M11.9 26.9A12.1 12.1 0 0 1 12 24c0-1.4.2-2.7.7-4l-7-5.3A19.8 19.8 0 0 0 4 24c0 2.8.6 5.5 1.7 8l6.2-5.1z" />
        </svg>
        <span>{busy ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
      <button
        type="button"
        onClick={onFacebook}
        disabled={disabled}
        className={`${buttonClass} border border-blue-700 bg-blue-600 text-surface-inverse hover:bg-blue-700 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--bg)] dark:border-border/80 dark:bg-background/20 dark:text-foreground dark:hover:bg-background/40`}
      >
        <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="12" fill="#1877F2" />
          <path fill="white" d="M13.5 21v-8.2h2.75l.41-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14c-.3-.04-1.33-.14-2.53-.14-2.5 0-4.22 1.52-4.22 4.32V9.6H7.2v3.2h2.85V21z" />
        </svg>
        <span>{busy ? 'Signing in...' : 'Sign in with Facebook'}</span>
      </button>
    </div>
  )
}
