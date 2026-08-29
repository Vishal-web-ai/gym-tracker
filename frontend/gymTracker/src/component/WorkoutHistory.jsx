import { useState, useEffect, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import SavedSession from './SavedSession'
import { getSessions, deleteSession, removeExerciseMedia } from '../services/storage'
import { deleteMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    if (/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}\s+\w+\s+\d{4}$/.test(dateStr)) return dateStr
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

const CARD_COLORS = [
    { text: '#fb923c', dropdownBg: 'rgba(249,115,22,0.05)', dropdownBorder: 'rgba(249,115,22,0.12)', cardBg: 'rgba(249,115,22,0.07)', cardBorder: 'rgba(249,115,22,0.15)' },
    { text: '#38bdf8', dropdownBg: 'rgba(56,189,248,0.05)', dropdownBorder: 'rgba(56,189,248,0.12)', cardBg: 'rgba(56,189,248,0.07)', cardBorder: 'rgba(56,189,248,0.15)' },
    { text: '#34d399', dropdownBg: 'rgba(52,211,153,0.05)', dropdownBorder: 'rgba(52,211,153,0.12)', cardBg: 'rgba(52,211,153,0.07)', cardBorder: 'rgba(52,211,153,0.15)' },
    { text: '#a855f7', dropdownBg: 'rgba(168,85,247,0.05)', dropdownBorder: 'rgba(168,85,247,0.12)', cardBg: 'rgba(168,85,247,0.07)', cardBorder: 'rgba(168,85,247,0.15)' },
    { text: '#fbbf24', dropdownBg: 'rgba(251,191,36,0.05)', dropdownBorder: 'rgba(251,191,36,0.12)', cardBg: 'rgba(251,191,36,0.07)', cardBorder: 'rgba(251,191,36,0.15)' },
    { text: '#f43f5e', dropdownBg: 'rgba(244,63,94,0.05)', dropdownBorder: 'rgba(244,63,94,0.12)', cardBg: 'rgba(244,63,94,0.07)', cardBorder: 'rgba(244,63,94,0.15)' },
    { text: '#e879f9', dropdownBg: 'rgba(232,121,249,0.05)', dropdownBorder: 'rgba(232,121,249,0.12)', cardBg: 'rgba(232,121,249,0.07)', cardBorder: 'rgba(232,121,249,0.15)' },
    { text: '#fde047', dropdownBg: 'rgba(253,224,71,0.05)', dropdownBorder: 'rgba(253,224,71,0.12)', cardBg: 'rgba(253,224,71,0.07)', cardBorder: 'rgba(253,224,71,0.15)' },
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const setLines = (ex) => {
    const sets = Array.isArray(ex.sets) ? ex.sets : []
    return sets
        .map((s) => {
            if (s && typeof s === 'object') {
                const parts = []
                if (s.weight && s.weight !== '—') parts.push(s.weight)
                if (s.reps && s.reps !== '—') parts.push(s.reps)
                return parts.filter(Boolean).join(' × ')
            }
            return s !== '—' ? s : ''
        })
        .filter(Boolean)
}

const setsText = (ex) => {
    const sets = Array.isArray(ex.sets) ? ex.sets : []
    if (!sets.length) return '—'
    if (typeof sets[0] === 'object') {
        return sets
            .map(s => {
                const parts = []
                if (s.reps && s.reps !== '—') parts.push(s.reps)
                if (s.weight && s.weight !== '—') parts.push(s.weight)
                return parts.join(' × ')
            })
            .filter(Boolean)
            .join(' · ')
    }
    return sets.filter(s => s !== '—').join(' × ')
}

const WorkoutHistory = ({ onClose, onDeleted }) => {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)

    useEffect(() => {
        let cancelled = false
        getSessions()
            .then(list => {
                if (!cancelled) {
                    setSessions(list)
                    setLoading(false)
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setLoadError(getErrorMessage(err))
                    setLoading(false)
                }
            })
        return () => { cancelled = true }
    }, [])

    const allExercises = useMemo(() => {
        const flat = []
        for (const session of sessions) {
            const exercises = Array.isArray(session.exercises) ? session.exercises : []
            for (const exercise of exercises) {
                flat.push({ exercise, session })
            }
        }
        return flat
    }, [sessions])

    const uniqueNames = useMemo(() => {
        const names = new Set()
        for (const { exercise } of allExercises) {
            if (exercise.name) names.add(exercise.name)
        }
        return [...names].sort()
    }, [allExercises])

    const suggestions = useMemo(() => {
        if (!searchQuery.trim()) return []
        const q = searchQuery.toLowerCase()
        return uniqueNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8)
    }, [searchQuery, uniqueNames])

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return []
        const q = searchQuery.toLowerCase()
        return allExercises.filter(({ exercise }) =>
            exercise.name && exercise.name.toLowerCase().includes(q)
        )
    }, [allExercises, searchQuery])

    const groupedResults = useMemo(() => {
        const groups = []
        let currentDate = null
        for (const item of filtered) {
            const date = item.session.date
            if (date !== currentDate) {
                currentDate = date
                groups.push({ type: 'date', date: formatDate(date), key: date })
            }
            const sessionIdx = sessions.findIndex(s => s.id === item.session.id)
            const color = CARD_COLORS[sessionIdx >= 0 ? sessionIdx % CARD_COLORS.length : 0]
            groups.push({ type: 'exercise', ...item, color, key: item.session.id + '-' + item.exercise.name })
        }
        return groups
    }, [filtered, sessions])

    const handleDelete = async (id) => {
        try {
            await deleteSession(id)
            setSessions(prev => prev.filter(s => s.id !== id))
            if (onDeleted) onDeleted()
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const handleDeleteMedia = async (sessionId, exerciseIndex, mediaId) => {
        try {
            await deleteMedia(mediaId)
            const updated = await removeExerciseMedia(sessionId, exerciseIndex, mediaId)
            if (updated) {
                setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
            }
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const isSearching = searchQuery.trim().length > 0

    return (
        <div className='fixed inset-0 bg-neutral-900 z-50 flex flex-col'>
            <div className='flex items-center justify-between px-5 h-16 border-b border-neutral-700 shrink-0'>
                <h1 className='text-white text-xl font-bold font-mono'>Workout History</h1>
                <X
                    onClick={onClose}
                    className='text-white cursor-pointer hover:opacity-70'
                    size={28}
                />
            </div>

            <div className='px-4 pt-3 pb-2 shrink-0 relative'>
                <div className='flex items-center bg-neutral-800 border border-neutral-600 rounded-xl px-3 py-2'>
                    <Search size={18} className='text-neutral-400 shrink-0' />
                    <input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder='Search exercises...'
                        className='flex-1 bg-transparent text-white font-mono text-sm ml-2 outline-none placeholder-neutral-500'
                    />
                    {isSearching && (
                        <button
                            onClick={() => { setSearchQuery(''); setShowSuggestions(false) }}
                            className='text-neutral-400 hover:text-white ml-1 cursor-pointer'
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                    <div className='absolute left-4 right-4 top-full mt-1 bg-neutral-800 border border-neutral-600 rounded-xl overflow-hidden z-10 shadow-lg'>
                        {suggestions.map(name => (
                            <button
                                key={name}
                                onMouseDown={() => {
                                    setSearchQuery(name)
                                    setShowSuggestions(false)
                                }}
                                className='w-full text-left px-4 py-2.5 text-orange-400 font-mono text-sm hover:bg-white/[0.06] transition-colors cursor-pointer'
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className='flex-1 overflow-y-auto p-4 scroll'>
                {loading ? (
                    <p className='text-white/30 text-center font-mono py-10'>Loading...</p>
                ) : loadError ? (
                    <p className='text-red-400 text-center font-mono text-sm py-10'>{loadError}</p>
                ) : isSearching ? (
                    filtered.length === 0 ? (
                        <p className='text-white/30 text-center font-mono py-10'>
                            No exercises found for "{searchQuery}"
                        </p>
                    ) : (
                        <div className='space-y-3'>
                            {groupedResults.map(item => {
                                if (item.type === 'date') {
                                    return (
                                        <div key={item.key} className='flex items-center gap-2 mt-1'>
                                            <p className='text-orange-400 font-mono text-sm font-bold'>
                                                {item.date}
                                            </p>
                                        </div>
                                    )
                                }
                                const { exercise, color } = item
                                return (
                                    <div
                                        key={item.key}
                                        style={{ backgroundColor: color.cardBg, borderColor: color.cardBorder }}
                                        className='border p-3 rounded-xl transition-all duration-300'
                                    >
                                        <div className='flex items-center justify-between'>
                                            <p className='font-semibold font-mono' style={{ color: color.text }}>
                                                {exercise.name}
                                            </p>
                                            {(exercise.mode === 'timer' || exercise.mode === 'counts') && (
                                                <span className='font-mono text-xs border px-1.5 py-0.5 rounded' style={{ color: color.text, opacity: 0.5, borderColor: color.cardBorder }}>
                                                    {exercise.mode === 'timer' ? 'timer' : 'counts'}
                                                </span>
                                            )}
                                        </div>
                                        {exercise.mode === 'timer' ? (
                                            <p className='font-mono text-sm mt-1' style={{ color: color.text, opacity: 0.5 }}>
                                                Time: {setsText(exercise)}
                                            </p>
                                        ) : exercise.mode === 'counts' ? (
                                            <p className='font-mono text-sm mt-1' style={{ color: color.text, opacity: 0.5 }}>
                                                Counts: {setsText(exercise)}
                                            </p>
                                        ) : typeof exercise.sets?.[0] === 'object' ? (
                                            <div className='mt-1.5 space-y-1'>
                                                {setLines(exercise).map((line, li) => (
                                                    <p key={li} className='font-mono text-sm' style={{ color: color.text, opacity: 0.5 }}>
                                                        Set {li + 1}: {line}
                                                    </p>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className='font-mono text-sm mt-1' style={{ color: color.text, opacity: 0.5 }}>
                                                Sets: {setsText(exercise)}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )
                ) : (
                    <SavedSession
                        sessions={sessions}
                        onDelete={handleDelete}
                        onDeleteMedia={handleDeleteMedia}
                        onUpdate={(updated) => {
                            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
                        }}
                    />
                )}
            </div>
        </div>
    )
}

export default WorkoutHistory
