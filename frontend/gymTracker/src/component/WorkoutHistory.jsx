import { useState, useEffect, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import SavedSession from './SavedSession'
import { getSessions, deleteSession, removeExerciseMedia } from '../services/storage'
import { deleteMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
                                return (
                                    <div
                                        key={item.key}
                                        className='bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/50 p-3 rounded-xl transition-all duration-300'
                                    >
                                        <div className='flex items-center justify-between'>
                                            <p className='text-orange-400 font-semibold font-mono'>
                                                {exercise.name}
                                            </p>
                                            {exercise.mode === 'timer' && (
                                                <span className='text-orange-500/40 font-mono text-xs border border-orange-500/20 px-1.5 py-0.5 rounded'>
                                                    timer
                                                </span>
                                            )}
                                        </div>
                                        <p className='text-orange-500/60 font-mono text-sm mt-1'>
                                            {exercise.mode === 'timer' ? 'Time' : 'Sets'}: {setsText(exercise)}
                                        </p>
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
