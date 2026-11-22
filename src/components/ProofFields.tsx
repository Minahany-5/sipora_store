import { useRef } from 'react'
import { validateScreenshot } from '../lib/storage'
import Field from './Field'

interface ProofFieldsProps {
  reference: string
  onReference: (value: string) => void
  file: File | null
  onFile: (file: File | null) => void
  referenceError?: string | null
  fileError?: string | null
  disabled?: boolean
}

/** Instapay proof: the reference number OR a screenshot (or both). */
export default function ProofFields({ reference, onReference, file, onFile, referenceError, fileError, disabled }: ProofFieldsProps) {
  const input = useRef<HTMLInputElement>(null)
  const problem = file ? validateScreenshot(file) : null

  return (
    <div className="space-y-3">
      <Field
        label="Instapay reference number"
        value={reference}
        onChange={(e) => onReference(e.target.value)}
        placeholder="For example 12345678"
        autoComplete="off"
        disabled={disabled}
        error={referenceError}
        hint="You can find it in your Instapay receipt."
      />
      <p className="text-center text-xs text-plum/50">or</p>
      <div>
        <p className="text-xs font-semibold text-plum/70">Screenshot of the payment</p>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Choose a screenshot"
          disabled={disabled}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="mt-1 flex items-center gap-3 rounded-full border border-white/90 bg-white/60 px-4 py-2 text-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className="rounded-full bg-plum px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {file ? 'Change' : 'Choose picture'}
          </button>
          <span className="min-w-0 flex-1 truncate text-plum/70">{file ? file.name : 'No picture yet'}</span>
          {file && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onFile(null)
                if (input.current) input.current.value = ''
              }}
              aria-label="Remove the picture"
              className="text-plum/50"
            >
              ✕
            </button>
          )}
        </div>
        {(problem || fileError) && <p className="mt-1 ps-2 text-xs font-medium text-[#a3283f]">{problem ?? fileError}</p>}
      </div>
    </div>
  )
}
