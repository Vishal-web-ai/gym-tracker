import { useState, useEffect, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import SavedSession from './SavedSession'
import { getSessions, deleteSession, removeExerciseMedia } from '../services/storage'
import { deleteMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'
import { getLadders } from '../services/storage'
import { ladderView } from '../services/progression'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatSet = (s, mode) => {
    if (mode === 'timer') {
        return s.reps && s.reps !== '—' ? s.reps : '—'
    }
    const w = s.weight && s.weight !== '—' ? s.weight : ''
    const r = s.reps && s.reps !== '—' ? s.reps : ''
    if (w && r) return `${w}*${r}r`
    if (w) return w
    if (r) return `${r}r`
    return '—'
}

const WorkoutHistory = ({ onClose, onDeleted }) => {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [ladders, setLadders] = useState({})

    useEffect(() => {
        let cancelled = false
        getLadders().then(l => { if (!cancelled) setLadders(l) })
        return () => { cancelled = true }
    }, [])

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
            const dayName = DAYS[new Date(date).getDay()]
            if (date !== currentDate) {
                currentDate = date
                groups.push({ type: 'date', date, dayName, key: date })
            }
            groups.push({ type: 'exercise', ...item, key: item.session.id + '-' + item.exercise.name })
        }
        return groups
    }, [filtered])

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
                                className='w-full text-left px-4 py-2.5 text-orange-400 font-mono text-sm hover:bg-orange-500/10 transition-colors cursor-pointer'
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className='flex-1 overflow-y-auto p-4 scroll'>
                {loading ? (
                    <p className='text-orange-500/50 text-center font-mono py-10'>Loading...</p>
                ) : loadError ? (
                    <p className='text-red-400 text-center font-mono text-sm py-10'>{loadError}</p>
                ) : isSearching ? (
                    filtered.length === 0 ? (
                        <p className='text-orange-500/50 text-center font-mono py-10'>
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
                                            <p className='text-orange-500/40 font-mono text-xs'>
                                                {item.dayName}
                                            </p>
                                        </div>
                                    )
                                }
                                const { exercise } = item
                                const entry = ladders[exercise.name]
                                const view = entry ? ladderView(entry) : null
                                const level = view ? view.successes : 0
                                const sets = Array.isArray(exercise.sets) ? exercise.sets : []
                                return (
                                    <div
                                        key={item.key}
                                        className='bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/50 p-3 rounded-xl transition-all duration-300'
                                    >
                                        <div className='flex items-center justify-between mb-1.5'>
                                            <p className='text-orange-400 font-semibold font-mono'>
                                                {exercise.name}
                                            </p>
                                            {level > 0 && (
                                                <span
                                                    className='font-mono text-xs font-bold px-1.5 py-0.5 rounded'
                                                    style={{ color: view.color, backgroundColor: view.color + '20', borderColor: view.color + '40', borderWidth: 1 }}
                                                >
                                                    Lv.{level}
                                                </span>
                                            )}
                                        </div>
                                        <div className='flex flex-wrap gap-x-3 gap-y-0.5'>
                                            {sets.map((s, i) => (
                                                <span key={i} className='text-orange-500/60 font-mono text-xs'>
                                                    {formatSet(s, exercise.mode)}
                                                </span>
                                            ))}
                                        </div>
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
