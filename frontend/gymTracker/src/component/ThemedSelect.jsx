import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const ThemedSelect = ({ value, onChange, options }) => {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const onDocClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDocClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [])

    const current = options.find(o => o.value === value)

    return (
        <div ref={ref} className='relative'>
            <button
                type='button'
                onClick={() => setOpen(v => !v)}
                aria-haspopup='listbox'
                aria-expanded={open}
                className={`w-full flex items-center gap-2 bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500 font-mono text-sm cursor-pointer text-left ${
                    open ? 'border-orange-500' : ''
                }`}
            >
                <span className='flex-1 truncate'>{current?.label}</span>
                <ChevronDown
                    size={16}
                    className={`text-orange-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <div
                    role='listbox'
                    className='absolute top-full left-0 right-0 mt-1 z-20 max-h-56 overflow-y-auto scroll bg-[#1a1a1a] border border-orange-500/40 rounded-lg shadow-2xl shadow-black/50'
                >
                    {options.map(o => (
                        <button
                            key={o.value}
                            type='button'
                            role='option'
                            aria-selected={o.value === value}
                            onClick={() => {
                                onChange({ target: { value: o.value } })
                                setOpen(false)
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left font-mono text-sm cursor-pointer transition-colors ${
                                o.value === value
                                    ? 'bg-orange-500 text-black'
                                    : 'text-white hover:bg-orange-500/20'
                            }`}
                        >
                            {o.value === value && <Check size={14} className='shrink-0' />}
                            <span className='flex-1 truncate'>{o.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ThemedSelect
