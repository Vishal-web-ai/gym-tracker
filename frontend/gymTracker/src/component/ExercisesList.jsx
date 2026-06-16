import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import api from '../services/api'

const CATEGORIES = ['Chest', 'Back', 'Biceps', 'Triceps', 'Arms', 'Shoulders', 'Legs', 'Core', 'Cardio']

const defaultExercises = [
    {
        category: 'Chest',
        items: [
            { name: 'Flat Bench Press', muscle: 'Chest (Middle)', image: '/exercises/flat-bench-press.jpg' },
            { name: 'Incline Bench Press', muscle: 'Chest (Upper)', image: '/exercises/incline-bench-press.png' },
            { name: 'Decline Bench Press', muscle: 'Chest (Lower)', image: '/exercises/decline-bench-press.png' },
            { name: 'Machine Chest Press', muscle: 'Chest', image: '/exercises/machine-chest-press.png' },
            { name: 'Pec Fly', muscle: 'Chest', image: '/exercises/pec-fly.png' },
            { name: 'Cable Crossover', muscle: 'Chest', image: '/exercises/cable-crossover.png' },
            { name: 'Push-Up', muscle: 'Chest', image: '/exercises/push-up.png' },
            { name: 'Chest Dip', muscle: 'Chest (Lower)', image: '/exercises/chest-dips.png' },
            { name: 'Low Cable Fly', muscle: 'Chest (Upper)', image: '/exercises/low-cabel-fly.png' },
            { name: 'High Cable Fly', muscle: 'Chest (Lower)', image: '/exercises/high-cable-fly.png' }
        ]
    },
    {
        category: 'Back',
        items: [
            { name: 'Lat Pulldown', muscle: 'Lats', image: '/exercises/latpull-down.png' },
            { name: 'Seated Cable Row', muscle: 'Middle Back', image: '/exercises/seated-cable-row.png' },
            { name: 'Wide Row', muscle: 'Upper Back', image: '/exercises/wide-back-row.png' },
            { name: 'Deadlift', muscle: 'Full Back / Posterior Chain', image: '/exercises/deadlift.png' },
            { name: 'Barbell Row', muscle: 'Middle Back', image: '/exercises/barbell-row.png' },
            { name: 'T-Bar Row', muscle: 'Middle Back', image: '/exercises/t-bar-row.png' },
            { name: 'Pull-Up', muscle: 'Lats', image: '/exercises/pull-up.png' },
            { name: 'Single Arm Dumbbell Row', muscle: 'Middle Back', image: '/exercises/single-arm-dumbell-row.png' },
            { name: 'Lats Pullover', muscle: 'Lats', image: '/exercises/latpull-over.png' }
        ]
    },
    {
        category: 'Biceps',
        items: [
            { name: 'Barbell Curl', muscle: 'Biceps (Both Head)', image: '/exercises/biceps-barbellcurl.png' },
            { name: 'Dumbbell Curl', muscle: 'Biceps (Both Head)', image: '/exercises/dumbell-curl.png' },
            { name: 'Hammer Curl', muscle: 'Brachialis / Brachioradialis', image: '/exercises/hammer-curl.png' },
            { name: 'Preacher Curl', muscle: 'Biceps (Short Head)', image: '/exercises/pecher-curl.png' },
            { name: 'Cable Curl', muscle: 'Biceps', image: '/exercises/cable-curl.png' },
            { name: 'Incline Dumbbell Curl', muscle: 'Biceps (Long Head)', image: '/exercises/incline-dumbell-curl.png' },
            { name: 'Spider Curl', muscle: 'Biceps', image: '/exercises/spider-curl.png' },
        ]
    },
    {
        category: 'Triceps',
        items: [
            { name: 'Tricep Extension', muscle: 'Triceps (All Heads)', image: '/exercises/triceps-pushdown.png' },
            { name: 'Skull Crusher', muscle: 'Triceps (Long Head)', image: '/exercises/skull-crusher.png' },
            { name: 'Overhead Tricep Extension', muscle: 'Triceps (Long Head)', image: '/exercises/overhead-tricep.png' },
            { name: 'Single tricep Pushdown', muscle: 'Triceps', image: '/exercises/single-tricep-pushdown.png' },
        ]
    },
    {
        category: 'Arms',
        items: [
            { name: 'Wrist Curl', muscle: 'Back part of forearm', image: '/exercises/wrist-curl.png' },
            { name: 'Reverse Wrist Curl', muscle: 'Front part of forearm', image: '/exercises/reverse-wrist-curl.png' },
            { name: 'Reverse Curl', muscle: 'Brachioradialis', image: '/exercises/reverse-curl.png' }
        ]
    },
    {
        category: 'Shoulders',
        items: [
            { name: 'Front Raise', muscle: 'Front Delts', image: '/exercises/front-raises.png' },
            { name: 'Overhead Press', muscle: 'Front / Side Delts', image: '/exercises/overhead-press.png' },
            { name: 'Machine Shoulder Press', muscle: 'Front / Side Delts', image: '/exercises/machine-overhead-press.png' },
            { name: 'Lateral Raises', muscle: 'Side Delts', image: '/exercises/lateral-raises-dumbell.png' },
            { name: 'Cable Lateral Raises', muscle: 'Side Delts', image: '/exercises/lateral-raises-cable.png' },
            { name: 'Upright Row', muscle: 'Side Delts / Traps', image: '/exercises/upright.png' },
            { name: 'Rear Delt Fly', muscle: 'Rear Delts', image: '/exercises/rear-delt-fly.png' },
            { name: 'Reverse Pec Deck', muscle: 'Rear Delts', image: '/exercises/reverse-pec-deck.png' },
            { name: 'Face Pull', muscle: 'Rear Delts', image: '/exercises/face-pull.png' },
            { name: 'Shrugs', muscle: 'Traps', image: '/exercises/shrugs.png' },
        ]
    },
    {
        category: 'Legs',
        items: [
            { name: 'Leg Press', muscle: 'Quads', image: '/exercises/leg-press.png' },
            { name: 'Squat', muscle: 'Quads', image: '/exercises/squat.png' },
            { name: 'Romanian Deadlift', muscle: 'Hamstrings / Glutes', image: '/exercises/rdl.png' },
            { name: 'Hamstring Curl', muscle: 'Hamstrings', image: '/exercises/seated-ham-curl.png' },
            { name: 'Pendulum Squat', muscle: 'Quads', image: '/exercises/pendulum-squat.png' },
            { name: 'Bulgarian Split Squat', muscle: 'Quads', image: '/exercises/bss.png' },
            { name: 'Leg Extension', muscle: 'Quads', image: '/exercises/leg-extention.png' },
            { name: 'Calf Raise', muscle: 'Calves', image: '/exercises/calf-rasises.png' },
            { name: 'Hip Thrust', muscle: 'Glutes', image: '/exercises/hip-thrust.png' },
            { name: 'Hack Squat', muscle: 'Quads', image: '/exercises/hack-squat.png' },
            { name: 'Walking Lunges', muscle: 'Quads / Glutes', image: '/exercises/walking-lunges.png' },
            { name: 'Glute Kickback', muscle: 'Glutes', image: '/exercises/glutes-kickback.png' }
        ]
    },
    {
        category: 'Core',
        items: [
            { name: 'Plank', muscle: 'Core (Overall)', image: '/exercises/plank.png' },
            { name: 'Bench Crunch', muscle: 'Upper Abs', image: '/exercises/decline-situp.png' },
            { name: 'Hanging Leg Raise', muscle: 'Lower Abs', image: '/exercises/leg-raises.png' },
            { name: 'Cable Crunch', muscle: 'Upper Abs', image: '/exercises/cable-crunch.png' },
            { name: 'Wood Chop', muscle: 'Obliques / Core', image: '/exercises/wood-chopper.png' }
        ]
    }
]

function groupByCategory(exercises) {
    const map = {}
    for (const ex of exercises) {
        if (!map[ex.category]) map[ex.category] = []
        map[ex.category].push(ex)
    }
    return Object.entries(map).sort(([a], [b]) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b))
}

const formInitial = { name: '', category: 'Chest', muscle: '' }

const ExercisesList = ({ onSelectExercise, onClose }) => {
    const [activeTab, setActiveTab] = useState('default')
    const [customExercises, setCustomExercises] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState(formInitial)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [loading, setLoading] = useState(false)

    const fetchExercises = async () => {
        setLoading(true)
        try {
            const res = await api.get('/exercises')
            setCustomExercises(res.data.exercises || [])
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingId(null)
        setFormData(formInitial)
    }

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.category) return
        setSaving(true)
        setSaveError('')
        try {
            if (editingId) {
                await api.put(`/exercises/${editingId}`, formData)
            } else {
                await api.post('/exercises', formData)
            }
            resetForm()
            await fetchExercises()
        } catch (err) {
            setSaveError(err.response?.data?.message || err.message || 'Failed to save exercise')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (ex) => {
        setEditingId(ex._id)
        setFormData({ name: ex.name, category: ex.category, muscle: ex.muscle || '' })
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/exercises/${id}`)
            await fetchExercises()
        } catch {
            // ignore
        }
    }

    return (
        <div className='h-full w-full md:w-3/4 flex justify-center'>
            <div className='scroll h-full w-full border border-orange-500 rounded-2xl overflow-y-auto overflow-x-hidden p-5 relative'>
                <button
                    onClick={onClose}
                    className='sticky top-0 right-0 ml-auto text-white px-3 py-1 text-2xl hover:text-orange-500 transition-all duration-300 font-semibold cursor-pointer rounded z-10 block'
                >
                    X
                </button>

                {/* Tabs */}
                <div className='flex bg-black/30 rounded-xl p-1 mb-6 mt-2'>
                    <button
                        onClick={() => setActiveTab('default')}
                        className={`flex-1 py-2 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${
                            activeTab === 'default'
                                ? 'bg-orange-500 text-black'
                                : 'text-orange-500/50 hover:text-orange-400'
                        }`}
                    >
                        Default
                    </button>
                    <button
                        onClick={() => { setActiveTab('custom'); fetchExercises() }}
                        className={`flex-1 py-2 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${
                            activeTab === 'custom'
                                ? 'bg-orange-500 text-black'
                                : 'text-orange-500/50 hover:text-orange-400'
                        }`}
                    >
                        My Exercises
                    </button>
                </div>

                {activeTab === 'custom' && (
                    <div className='mb-4'>
                        {!showForm ? (
                            <button
                                onClick={() => { setShowForm(true); setEditingId(null); setFormData(formInitial) }}
                                className='flex items-center gap-2 text-orange-400 hover:text-orange-300 font-mono text-sm transition-all cursor-pointer'
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
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                                    className='w-full bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500 font-mono text-sm'
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat} className='bg-black text-white'>{cat}</option>
                                    ))}
                                </select>
                                <input
                                    type='text'
                                    value={formData.muscle}
                                    onChange={e => setFormData(p => ({ ...p, muscle: e.target.value }))}
                                    placeholder='Target muscle (optional)'
                                    className='w-full bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 font-mono text-sm'
                                />
                                {saveError && (
                                    <p className='text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/30 rounded-lg p-2'>{saveError}</p>
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
                )}

                <div className='py-2 pr-5'>
                    {activeTab === 'default' ? (
                        defaultExercises.map((group, idx) => (
                            <div key={idx} className='flex flex-col font-mono mb-5'>
                                <h1 className='font-bold text-3xl text-orange-600'>{group.category}</h1>
                                <div className='pt-3 font-bold text-lg cursor-pointer'>
                                    {group.items.map((exercise, idx2) => (
                                        <h3
                                            key={idx2}
                                            onClick={() => onSelectExercise(exercise)}
                                            className='hover:bg-orange-500/10 hover:text-orange-400 hover:border-l-2 hover:border-orange-500 hover:pl-4 transition-all duration-200 px-3 py-2 rounded-lg whitespace-nowrap cursor-pointer'
                                        >
                                            {exercise.name}
                                        </h3>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : loading ? (
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
                                            key={exercise._id}
                                            className='flex items-center justify-between group hover:bg-orange-500/10 hover:border-l-2 hover:border-orange-500 hover:pl-4 transition-all duration-200 px-3 py-2 rounded-lg'
                                        >
                                            <h3
                                                onClick={() => onSelectExercise(exercise)}
                                                className='flex-1 cursor-pointer'
                                            >
                                                {exercise.name}
                                            </h3>
                                            <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                                <button
                                                    onClick={() => handleEdit(exercise)}
                                                    className='p-1 text-orange-400 hover:text-orange-300 transition-all cursor-pointer'
                                                    title='Edit'
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(exercise._id)}
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
        </div>
    )
}

export default ExercisesList