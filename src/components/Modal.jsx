import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export default function Modal({ open, title, description, children, onClose }) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-3 py-3 sm:items-center sm:px-4 sm:py-6"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[calc(100vh-24px)] w-full max-w-xl overflow-y-auto rounded-lg border border-[#e8dfd2] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.18)] animate-[modal-enter_120ms_ease-out_both] sm:max-h-[calc(100vh-48px)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eee7dd] px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900">{title}</h2>
            {description && <p className="mt-1 text-sm font-medium text-zinc-500">{description}</p>}
          </div>
          <button
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
