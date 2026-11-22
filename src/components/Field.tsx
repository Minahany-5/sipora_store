import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const BASE =
  'mt-1 w-full border border-white/90 bg-white/60 px-5 py-3 text-sm outline-none placeholder:text-plum/40 focus:ring-2 focus:ring-plum/40'

interface CommonProps {
  label: string
  error?: string | null
  hint?: string
}

function Wrap({ label, htmlFor, error, hint, children }: CommonProps & { htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-plum/70">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 ps-2 text-xs text-plum/50">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 ps-2 text-xs font-medium text-[#a3283f]">
          {error}
        </p>
      )}
    </div>
  )
}

/** A text box with a label (rounded, like the search box). */
export default function Field({ label, error, hint, id, className = '', ...rest }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrap label={label} htmlFor={fid} error={error} hint={hint}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={`${BASE} rounded-full ${className}`}
        {...rest}
      />
    </Wrap>
  )
}

export function TextAreaField({ label, error, hint, id, className = '', ...rest }: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrap label={label} htmlFor={fid} error={error} hint={hint}>
      <textarea
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={`${BASE} rounded-3xl ${className}`}
        {...rest}
      />
    </Wrap>
  )
}
