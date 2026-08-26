import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Dumbbell, Timer, User } from 'lucide-react'
import { getCustomExercises, createExercise, updateExercise, deleteExercise } from '../services/storage'
import { parseChallengeTime, formatChallengeTime } from '../services/progression'
import ThemedSelect from './ThemedSelect'

const CATEGORIES = ['Chest', 'Back', 'Biceps', 'Triceps', 'Arms', 'Shoulders', 'Legs', 'Core', 'Cardio']

const MODES = [
    { key: 'weight', label: 'Weight (Strength)', Icon: Dumbbell },
    { key: 'bodyweight', label: 'Bodyweight (Reps + Extra)', Icon: User },
    { key: 'timer', label: 'Timer (Cardio)', Icon: Timer }
]

function groupByCategory(exercises) {
    const map = {}
    for (const ex of exercises) {
        const category = ex.category || 'Other'
        if (!map[category]) map[category] = []
        map[category].push(ex)
    }
    return Object.entries(map).sort(([a], [b]) => {
        const ia = CATEGORIES.indexOf(a)
        const ib = CATEGORIES.indexOf(b)
        return (ia === -1 ? CATEGORIES.length : ia) - (ib === -1 ? CATEGORIES.length : ib)
    })
}

const formInitial = { name: '', category: 'Chest', mode: 'weight', muscle: '', challengeTime: '' }

const MyExercises = ({ onClose }) => {
    const [customExercises, setCustomExercises] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState(formInitial)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [loading, setLoading] = useState(true)

    const fetchExercises = () => {
        return getCustomExercises()
            .then(setCustomExercises)
            .catch(() => {})
    }

    useEffect(() => {
        getCustomExercises()
            .then(list => {
                setCustomExercises(list)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const resetForm = () => {
        setShowForm(false)
        setEditingId(null)
        setFormData(formInitial)
    }

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.category) return
        const timeText = formData.challengeTime.trim()
        let challengeTime = null
        if (timeText) {
            challengeTime = parseChallengeTime(timeText)
            if (!challengeTime || challengeTime <= 0) {
                setSaveError('Invalid challenge time — use e.g. 90s, 5m or 2:30')
                return
            }
        }
        setSaving(true)
        setSaveError('')
        try {
            const payload = { ...formData, challengeTime }
            if (editingId) {
                await updateExercise(editingId, payload)
            } else {
                await createExercise(payload)
            }
            resetForm()
            await fetchExercises()
        } catch (err) {
            setSaveError(err?.message || 'Failed to save exercise')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (ex) => {
        setEditingId(ex.id)
        setFormData({ name: ex.name, category: ex.category, mode: ex.mode === 'timer' ? 'timer' : ex.mode === 'bodyweight' ? 'bodyweight' : 'weight', muscle: ex.muscle || '', challengeTime: formatChallengeTime(ex.challengeTime) })
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        try {
            await deleteExercise(id)
            await fetchExercises()
        } catch (err) {
            setSaveError(err?.message || 'Failed to delete exercise')
        }
    }

    const ModeBadge = ({ mode }) => {
        const m = MODES.find(x => x.key === (mode === 'timer' ? 'timer' : mode === 'bodyweight' ? 'bodyweight' : 'weight'))
        const { Icon } = m
        return (
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wide ${mode === 'timer' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : mode === 'bodyweight' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-orange-500/15 text-orange-300 border border-orange-500/30'}`}>
                <Icon size={10} />
                {mode === 'timer' ? 'TIMER' : mode === 'bodyweight' ? 'BODYWT' : 'WEIGHT'}
            </span>
        )
    }

    return (
        <div className='fixed inset-0 bg-neutral-900 z-50 flex flex-col'>
            <div className='flex items-center justify-between px-5 h-16 border-b border-neutral-700 shrink-0'>
                <h1 className='text-white text-xl font-bold font-mono'>My Exercises</h1>
                <X onClick={onClose} className='text-white cursor-pointer hover:opacity-70' size={28} />
            </div>

            <div className='flex-1 overflow-y-auto p-4 scroll'>
                {saveError && (
                    <p className='text-red-400 font-mono text-sm mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
                        {saveError}
                    </p>
                )}

                <div className='mb-4'>
                    {!showForm ? (
                        <button
                            onClick={() => { setShowForm(true); setEditingId(null); setFormData(formInitial) }}
                            className='flex items-center gap-2 bg-orange-500 text-black font-bold px-4 py-2 rounded-lg font-mono text-sm hover:bg-orange-400 transition-all cursor-pointer'
                        >
                            <Plus size={18} /> Add Exercise
                        </button>
                    ) : (
                        <div className='bg-black/40 border border-orange-500/30 rounded-xl p-4 space-y-3 animate-fadeIn'>
                            <input
                                type='text'
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder='Exercise name'
                                className='w-full bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 font-mono text-sm'
                            />
                            <div className='grid grid-cols-2 gap-3'>
                                <ThemedSelect
                                    value={formData.category}
                                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                                />
                                <ThemedSelect
                                    value={formData.mode}
                                    onChange={e => setFormData(p => ({ ...p, mode: e.target.value }))}
                                    options={MODES.map(m => ({ value: m.key, label: m.label }))}
                                />
                            </div>
                            <input
                                type='text'
                                value={formData.muscle}
                                onChange={e => setFormData(p => ({ ...p, muscle: e.target.value }))}
                                placeholder='Target muscle (optional)'
                                className='w-full bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 font-mono text-sm'
                            />
                            {(formData.mode === 'timer' || formData.category === 'Cardio') && (
                                <div>
                                    <p className='text-[10px] font-mono tracking-widest text-teal-400/60 mb-1'>CHALLENGE TIME — RANK 1 TARGET</p>
                                    <input
                                        type='text'
                                        value={formData.challengeTime}
                                        onChange={e => setFormData(p => ({ ...p, challengeTime: e.target.value }))}
                                        placeholder='e.g. 90s, 5m or 2:30'
                                        className='w-full bg-black/50 border border-teal-500/30 rounded-lg px-3 py-2 text-white placeholder-teal-500/50 outline-none focus:border-teal-500 font-mono text-sm'
                                    />
                                </div>
                            )}
                            <div className='flex gap-2'>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !formData.name.trim()}
                                    className='flex items-center gap-1 bg-orange-500 hover:bg-orange-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 cursor-pointer'
                                >
                                    <Check size={16} /> {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                                </button>
                                <button
                                    onClick={resetForm}
                                    className='flex items-center gap-1 border border-neutral-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-neutral-800 transition-all cursor-pointer'
                                >
                                    <X size={16} /> Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <p className='text-orange-500/50 text-center font-mono py-8'>Loading...</p>
                ) : customExercises.length === 0 ? (
                    <p className='text-orange-500/50 text-center font-mono py-8'>No custom exercises yet. Add one above!</p>
                ) : (
                    groupByCategory(customExercises).map(([category, items]) => (
                        <div key={category} className='flex flex-col font-mono mb-5'>
                            <h1 className='font-bold text-3xl text-orange-600'>{category}</h1>
                            <div className='pt-3 font-bold text-lg'>
                                {items.map((exercise) => (
                                    <div
                                        key={exercise.id}
                                        className='flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-orange-500/10 hover:border-l-2 hover:border-orange-500 hover:pl-4 transition-all duration-200'
                                    >
                                        <div className='flex flex-col min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <h3 className='text-white truncate'>{exercise.name}</h3>
                                                <ModeBadge mode={exercise.mode} />
                                            </div>
                                            {exercise.muscle && (
                                                <p className='text-neutral-400 text-xs font-normal truncate'>{exercise.muscle}</p>
                                            )}
                                        </div>
                                        <div className='flex items-center gap-1 shrink-0'>
                                            <button
                                                onClick={() => handleEdit(exercise)}
                                                className='p-1 text-orange-400 hover:text-orange-300 transition-all cursor-pointer'
                                                title='Edit'
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exercise.id)}
                                                className='p-1 text-red-400 hover:text-red-300 transition-all cursor-pointer'
                                                title='Delete'
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default MyExercises
