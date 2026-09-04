import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export default function SelectMenu({ value, options, onChange, className = '', buttonClassName = '', icon: Icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function close(event) {
      if (!ref.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-full border border-[#e8dfd2] bg-white px-4 text-xs font-bold text-zinc-600 shadow-sm hover:border-[#d8b149] hover:bg-[#fffaf0] hover:text-zinc-900 ${buttonClassName}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon size={15} className="shrink-0 text-[#9f7500]" />}
          <span className="truncate">{value}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] min-w-[150px] overflow-hidden rounded-xl border border-[#e8dfd2] bg-white p-1.5 shadow-[0_16px_36px_rgba(34,25,6,0.14)] animate-[dropdown-enter_100ms_ease-out_both]">
          {options.map((option) => {
            const active = option === value
            return (
              <button
                key={option}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold ${
                  active ? 'bg-[#fff4cf] text-[#8b6800]' : 'text-zinc-600 hover:bg-[#faf7f1] hover:text-zinc-950'
                }`}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                <span className="truncate">{option}</span>
                {active && <Check size={13} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
