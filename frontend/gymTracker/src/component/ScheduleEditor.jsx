import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Check, X, Plus, ChevronDown } from 'lucide-react'
import { getCustomExercises } from '../services/storage'
import { defaultExercises } from '../services/exercises'

const DAYS = [
    { key: 'monday', label: 'MON' },
    { key: 'tuesday', label: 'TUE' },
    { key: 'wednesday', label: 'WED' },
    { key: 'thursday', label: 'THU' },
    { key: 'friday', label: 'FRI' },
    { key: 'saturday', label: 'SAT' },
    { key: 'sunday', label: 'SUN' }
]

function normalize(schedule) {
    const out = {}
    for (const day of DAYS) {
        const list = Array.isArray(schedule?.[day.key]) ? schedule[day.key] : []
        out[day.key] = list
            .map(e => (typeof e === 'string' ? { name: e } : { name: e?.name || '', ...(e?.mode ? { mode: e.mode } : {}) }))
            .filter(e => e.name)
    }
    return out
}

function buildModeMap(custom) {
    const map = new Map()
    for (const group of defaultExercises) {
        for (const item of group.items) map.set(item.name.toLowerCase(), item.mode)
    }
    for (const ex of custom) map.set(ex.name.toLowerCase(), ex.mode)
    return map
}

function buildGroups(custom) {
    const map = new Map()
    const add = (category, name) => {
        const key = category || 'Other'
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(name)
    }
    for (const group of defaultExercises) {
        for (const item of group.items) add(group.category, item.name)
    }
    for (const ex of custom) add(ex.category, ex.name)

    const groups = []
    for (const [category, names] of map) {
        const seen = new Set()
        const unique = []
        for (const name of names) {
            const trimmed = name.trim()
            const low = trimmed.toLowerCase()
            if (low && !seen.has(low)) {
                seen.add(low)
                unique.push(trimmed)
            }
        }
        groups.push({ category, names: unique.sort((a, b) => a.localeCompare(b)) })
    }
    return groups
}

// selectedFirst: starts by showing the exercises already assigned to the day,
// with an inline picker to add new ones (used when editing an existing schedule).
// Otherwise the full picker is always visible (used during onboarding).
const ScheduleEditor = ({ schedule = {}, onChange, selectedFirst = false }) => {
    const [activeDay, setActiveDay] = useState(DAYS[0].key)
    const [query, setQuery] = useState('')
    const [pickerOpen, setPickerOpen] = useState(false)
    const [openGroup, setOpenGroup] = useState(null)
    const [custom, setCustom] = useState([])
    const listRef = useRef(null)
    const normalized = useMemo(() => normalize(schedule), [schedule])

    useEffect(() => {
        getCustomExercises().then(setCustom).catch(() => {})
    }, [])

    useEffect(() => {
        if (!openGroup || !listRef.current) return
        listRef.current
            .querySelector(`[data-group="${openGroup}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [openGroup])

    const groups = useMemo(() => buildGroups(custom), [custom])
    const modeByName = useMemo(() => buildModeMap(custom), [custom])

    const activeLabel = DAYS.find(d => d.key === activeDay)?.label || activeDay
    const assigned = normalized[activeDay] || []
    const assignedNames = new Set(assigned.map(e => e.name.toLowerCase()))
    const totalDays = DAYS.filter(d => (normalized[d.key] || []).length > 0).length

    const q = query.trim().toLowerCase()
    const visibleGroups = q
        ? groups
            .map(g => ({ category: g.category, names: g.names.filter(n => n.toLowerCase().includes(q)) }))
            .filter(g => g.names.length > 0)
        : groups
    const addableCount = groups.reduce((sum, g) => sum + g.names.filter(n => !assignedNames.has(n.toLowerCase())).length, 0)

    const toggle = (name) => {
        const has = assignedNames.has(name.toLowerCase())
        const next = has
            ? assigned.filter(e => e.name.toLowerCase() !== name.toLowerCase())
            : [...assigned, { name, mode: modeByName.get(name.toLowerCase()) }]
        onChange({ ...normalized, [activeDay]: next })
    }

    const removeAt = (index) => {
        onChange({ ...normalized, [activeDay]: assigned.filter((_, i) => i !== index) })
    }

    const renderGroups = (rows) => (
        <div ref={listRef} className='flex flex-col gap-1 max-h-64 overflow-y-auto scroll'>
            {visibleGroups.map(group => {
                const open = q ? true : openGroup === group.category
                const addedCount = group.names.filter(n => assignedNames.has(n.toLowerCase())).length
                return (
                    <div key={group.category} className='flex flex-col' data-group={group.category}>
                        <button
                            onClick={() => setOpenGroup(openGroup === group.category && !q ? null : group.category)}
                            className='flex items-center gap-1.5 rounded-lg px-2 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 transition-all cursor-pointer mt-0.5'
                        >
                            <ChevronDown size={12} className={`text-orange-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                            <span className='font-bebas text-orange-500 text-sm tracking-[1px]'>{group.category.toUpperCase()}</span>
                            <span className='font-mono text-[10px] text-white/40'>({group.names.length})</span>
                            {addedCount > 0 && (
                                <span className='font-mono text-[10px] text-emerald-400 ml-auto'>{addedCount} added</span>
                            )}
                        </button>
                        {open && group.names.map(name => rows(name))}
                    </div>
                )
            })}
            {visibleGroups.length === 0 && (
                <p className='font-mono text-white/30 text-xs text-center py-2'>No exercises match.</p>
            )}
        </div>
    )

    return (
        <div className='w-full flex flex-col gap-2'>
            <div className='flex flex-wrap gap-1 justify-center'>
                {DAYS.map(day => {
                    const count = (normalized[day.key] || []).length
                    const active = day.key === activeDay
                    return (
                        <button
                            key={day.key}
                            onClick={() => setActiveDay(day.key)}
                            className={`rounded-lg w-[4.5rem] py-1 font-mono text-sm transition-all cursor-pointer ${
                                active ? 'bg-orange-500 text-black font-bold' : 'bg-orange-500/10 text-orange-500/80'
                            }`}
                        >
                            {day.label}
                            {count > 0 && <span className={`ml-1 ${active ? 'text-black/70' : 'text-orange-500'}`}>({count})</span>}
                        </button>
                    )
                })}
            </div>

            <div className='h-4 mb-1'>
                {totalDays === 0 && (
                    <p className='font-mono text-white/40 text-xs text-center'>No workouts scheduled yet — leave rest days empty.</p>
                )}
            </div>

            <div className='bg-black/40 border border-orange-500/30 rounded-xl p-2'>
                <div className='flex items-center justify-between gap-2 mb-1'>
                    <p className='font-bebas tracking-[2px] text-orange-500'>{activeLabel}</p>
                </div>

                <div className={`flex flex-col gap-0.5 overflow-y-auto scroll mb-1 ${assigned.length === 0 ? 'h-6' : 'h-28'}`}>
                    {assigned.length === 0 ? (
                        <p className='font-mono text-white/30 text-xs'>Rest day — no exercises.</p>
                    ) : (
                        assigned.map((e, i) => (
                            <div key={`${e.name}-${i}`} className='flex items-center justify-between bg-orange-500 rounded-lg px-2 py-1'>
                                <p className='font-mono text-black font-bold text-xs truncate'>{e.name}</p>
                                <button onClick={() => removeAt(i)} className='text-black cursor-pointer shrink-0 ml-2' title='Remove'>
                                    <X size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {selectedFirst ? (
                    !pickerOpen ? (
                        <button
                            onClick={() => setPickerOpen(true)}
                            className='w-full flex items-center justify-center gap-1 rounded-lg border border-orange-500/40 py-1.5 font-mono text-xs font-bold text-orange-500 hover:bg-orange-500/10 transition-all cursor-pointer'
                        >
                            <Plus size={12} /> Add Exercises
                        </button>
                    ) : (
                        <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-1 border border-orange-500/30 rounded-lg px-2 py-1'>
                                <Search size={12} className='text-orange-500/60 shrink-0' />
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder='Search exercises'
                                    autoFocus
                                    className='bg-transparent text-white font-mono text-xs outline-none placeholder-orange-500/40 w-full'
                                />
                            </div>
                            {addableCount === 0 && !q ? (
                                <p className='font-mono text-white/30 text-xs text-center py-1'>All exercises added.</p>
                            ) : (
                                renderGroups(name => {
                                    const added = assignedNames.has(name.toLowerCase())
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => toggle(name)}
                                            className={`flex items-center justify-between rounded-lg px-2 py-1 font-mono text-xs transition-all cursor-pointer ${
                                                added ? 'bg-orange-500/20 text-orange-500' : 'bg-black/30 text-white/80 hover:bg-orange-500/10'
                                            }`}
                                        >
                                            <span className='truncate'>{name}</span>
                                            {added
                                                ? <Check size={12} className='shrink-0 ml-2' />
                                                : <Plus size={12} className='shrink-0 ml-2 text-orange-500' />}
                                        </button>
                                    )
                                })
                            )}
                            <button
                                onClick={() => setPickerOpen(false)}
                                className='rounded-lg py-1.5 font-mono text-xs text-white/50 hover:text-white/80 transition-all cursor-pointer'
                            >
                                Done
                            </button>
                        </div>
                    )
                ) : (
                    <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-1 border border-orange-500/30 rounded-lg px-2 py-1'>
                            <Search size={12} className='text-orange-500/60 shrink-0' />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder='Search exercises'
                                className='bg-transparent text-white font-mono text-xs outline-none placeholder-orange-500/40 w-full'
                            />
                        </div>
                        {renderGroups(name => {
                            const added = assignedNames.has(name.toLowerCase())
                            return (
                                <button
                                    key={name}
                                    onClick={() => toggle(name)}
                                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 font-mono text-xs transition-all cursor-pointer ${
                                        added ? 'bg-orange-500/20 text-orange-500' : 'bg-black/30 text-white/80 hover:bg-orange-500/10'
                                    }`}
                                >
                                    <span className='truncate'>{name}</span>
                                    {added && <Check size={12} className='shrink-0 ml-2' />}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ScheduleEditor
