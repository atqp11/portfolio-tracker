import React, { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  // optional input for confirmation (e.g. number of days to extend a trial)
  showInput?: boolean
  inputLabel?: string
  inputValue?: string | number
  inputPlaceholder?: string
  inputType?: string
  onInputChange?: (value: string) => void
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirm action',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  // input props
  showInput = false,
  inputLabel,
  inputValue,
  inputPlaceholder,
  inputType,
  onInputChange,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // focus management: move focus to cancel button when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus()
        else cancelRef.current?.focus()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden={!isOpen}
    >
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="bg-gray-900 border border-neutral-700 rounded-lg p-6 z-10 w-full max-w-lg mx-4"
      >
        <h3 id="confirm-modal-title" className="text-lg font-semibold text-gray-100 mb-2">
          {title}
        </h3>
        {description && (
          <p id="confirm-modal-desc" className="text-sm text-gray-300 mb-4">
            {description}
          </p>
        )}

        {showInput && (
          <div className="mb-4">
            {inputLabel && <label className="text-sm text-gray-200 block mb-1">{inputLabel}</label>}
            <input
              ref={inputRef}
              value={inputValue as any}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={inputPlaceholder}
              type={inputType || 'text'}
              className="w-full px-3 py-2 rounded border border-neutral-700 bg-neutral-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="bg-transparent border border-neutral-700 text-sm text-gray-100 px-3 py-2 rounded hover:bg-neutral-700/40"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            className="bg-indigo-600 text-white text-sm px-3 py-2 rounded hover:bg-indigo-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
