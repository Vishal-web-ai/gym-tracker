import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, ArrowLeft, ChevronRight, Search } from 'lucide-react'
import { getCustomExercises, createExercise, updateExercise, deleteExercise } from '../services/storage'
import { defaultExercises } from '../services/exercises'
import ThemedSelect from './ThemedSelect'

const CATEGORIES = ['Chest', 'Back', 'Biceps', 'Triceps', 'Arms', 'Shoulders', 'Legs', 'Core', 'Cardio']

const MODES = [
    { key: 'weight', label: 'Weight (Strength)' },
    { key: 'timer', label: 'Timer (Cardio)' }
]

const ModeTag = ({ mode }) => (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest border ${
        mode === 'timer'
            ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
            : 'bg-orange-500/10 text-orange-300 border-orange-500/30'
    }`}>
        {mode === 'timer' ? 'TIMER' : 'WEIGHT'}
    </span>
)

const formInitial = { name: '', category: 'Chest', mode: 'weight', muscle: '' }

const ExercisesList = ({ onSelectExercise, onClose }) => {
    const [customExercises, setCustomExercises] = useState([])
    const [query, setQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState(formInitial)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    useEffect(() => {
        getCustomExercises().then(setCustomExercises).catch(() => {})
    }, [])

    const combined = useMemo(() => {
        const list = []
        for (const group of defaultExercises) {
            for (const ex of group.items) list.push({ ...ex, category: group.category, custom: false })
        }
        for (const ex of customExercises) list.push({ ...ex, custom: true })
        return list
    }, [customExercises])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        return combined.filter(ex => {
            if (activeCategory !== 'all' && ex.category !== activeCategory) return false
            if (!q) return true
            return (ex.name + ' ' + (ex.muscle || '') + ' ' + (ex.category || '')).toLowerCase().includes(q)
        })
    }, [combined, query, activeCategory])

    const grouped = useMemo(() => {
        const map = {}
        for (const ex of filtered) {
            const c = ex.category || 'Other'
            if (!map[c]) map[c] = []
            map[c].push(ex)
        }
        const rank = c => (CATEGORIES.indexOf(c) === -1 ? 99 : CATEGORIES.indexOf(c))
        return Object.entries(map).sort(([a], [b]) => rank(a) - rank(b))
    }, [filtered])

    const searching = query.trim().length > 0

    const openAdd = (name = '') => {
        setEditingId(null)
        setFormData({
            name,
            category: activeCategory === 'all' ? 'Chest' : activeCategory,
            mode: 'weight',
            muscle: ''
        })
        setSaveError('')
        setShowForm(true)
    }

    const handleEdit = (ex) => {
        setEditingId(ex.id)
        setFormData({
            name: ex.name,
            category: ex.category,
            mode: ex.mode === 'timer' ? 'timer' : 'weight',
            muscle: ex.muscle || ''
        })
        setSaveError('')
        setShowForm(true)
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
                await updateExercise(editingId, formData)
            } else {
                await createExercise(formData)
            }
            resetForm()
            setCustomExercises(await getCustomExercises())
        } catch (err) {
            setSaveError(err?.message || 'Failed to save exercise')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteExercise(id)
            setCustomExercises(await getCustomExercises())
        } catch (err) {
            setSaveError(err?.message || 'Failed to delete exercise')
        }
    }

    const Row = ({ ex }) => (
        <div
            onClick={() => onSelectExercise(ex)}
            className='group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-orange-500/10 cursor-pointer transition-colors'
        >
            <span className='flex-1 truncate text-sm text-white'>{ex.name}</span>
            {ex.custom ? (
                <>
                    <ModeTag mode={ex.mode} />
                    <div className='flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button
                            onClick={e => { e.stopPropagation(); handleEdit(ex) }}
                            className='p-1 text-orange-400 hover:text-orange-300 transition-colors cursor-pointer'
                            title='Edit'
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); handleDelete(ex.id) }}
                            className='p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer'
                            title='Delete'
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </>
            ) : (
                <span className='hidden sm:block max-w-[45%] truncate text-[10px] text-neutral-500'>{ex.muscle}</span>
            )}
            <ChevronRight size={14} className='shrink-0 text-orange-500/30 group-hover:text-orange-500/60 transition-colors' />
        </div>
    )

    return (
        <div className='h-full w-full md:w-3/4 mx-auto flex flex-col relative'>
            <div className='flex items-center justify-between px-5 h-14 shrink-0'>
                <div className='flex items-center gap-3'>
                    <ArrowLeft
                        onClick={onClose}
                        className='text-white cursor-pointer hover:text-orange-400 transition-colors'
                        size={22}
                    />
                    <h1 className='text-white font-mono font-bold text-lg tracking-wide'>exercises</h1>
                </div>
                <span className='font-mono text-[11px] text-orange-500/50'>{combined.length}</span>
            </div>

            <div className='px-5 pb-2 space-y-2.5 shrink-0'>
                <div className='flex items-center gap-2 bg-black/40 border border-orange-500/30 rounded-lg px-3 py-2.5 focus-within:border-orange-500 transition-colors'>
                    <Search size={16} className='shrink-0 text-orange-500' />
                    <input
                        type='text'
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder='search exercises'
                        className='flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder-orange-500/40 min-w-0'
                    />
                    <span className='shrink-0 h-4 w-[2px] bg-orange-500 animate-blink' />
                    {query && (
                        <X
                            size={14}
                            onClick={() => setQuery('')}
                            className='shrink-0 text-orange-500/50 cursor-pointer hover:text-orange-400 transition-colors'
                        />
                    )}
                </div>

                <div className='scroll flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1'>
                    {['all', ...CATEGORIES].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                                activeCategory === cat
                                    ? 'bg-orange-500 text-black'
                                    : 'bg-black/30 text-orange-500/50 hover:text-orange-400 hover:bg-black/50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className='flex-1 overflow-y-auto scroll px-3 pb-4 min-h-0'>
                {searching && filtered.length > 0 && (
                    <div className='px-2 pt-3 pb-1 text-[10px] font-mono tracking-widest text-orange-500/50'>
                        {filtered.length} {filtered.length === 1 ? 'result' : 'results'} for '{query.trim()}'
                    </div>
                )}

                {filtered.length === 0 ? (
                    <div className='flex flex-col items-center justify-center text-center gap-2 h-56 px-6'>
                        <p className='font-mono text-sm text-orange-500/50'>
                            {searching ? `nothing for '${query.trim()}'` : 'no exercises here'}
                        </p>
                        <p className='font-mono text-xs text-neutral-500'>
                            {searching ? "not in your library yet — create it" : 'try another category'}
                        </p>
                        {searching && (
                            <button
                                onClick={() => openAdd(query.trim())}
                                className='mt-2 flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer'
                            >
                                <Plus size={16} /> add '{query.trim()}'
                            </button>
                        )}
                    </div>
                ) : searching ? (
                    filtered.map(ex => <Row key={ex.custom ? ex.id : ex.name} ex={ex} />)
                ) : (
                    grouped.map(([category, items]) => (
                        <div key={category}>
                            <div className='flex items-center gap-2 px-2 pt-4 pb-1'>
                                <span className='text-[10px] font-mono font-bold tracking-widest text-orange-500/50'>{category.toUpperCase()}</span>
                                <span className='text-[10px] font-mono text-orange-500/30'>{items.length}</span>
                                <span className='flex-1 h-px bg-orange-500/10' />
                            </div>
                            {items.map(ex => <Row key={ex.custom ? ex.id : ex.name} ex={ex} />)}
                        </div>
                    ))
                )}
            </div>

            <div className='p-4 border-t border-neutral-800 shrink-0'>
                <button
                    onClick={() => openAdd()}
                    className='w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer'
                >
                    <Plus size={18} /> add exercise
                </button>
            </div>

            {showForm && (
                <div className='fixed inset-0 z-50 bg-neutral-900 flex flex-col animate-fadeIn'>
                    <div className='flex items-center justify-between px-5 h-14 border-b border-neutral-700 shrink-0'>
                        <div className='flex items-center gap-3'>
                            <ArrowLeft
                                onClick={resetForm}
                                className='text-white cursor-pointer hover:text-orange-400 transition-colors'
                                size={22}
                            />
                            <h1 className='text-white font-mono font-bold text-lg tracking-wide'>
                                {editingId ? 'edit exercise' : 'add exercise'}
                            </h1>
                        </div>
                        <X onClick={resetForm} className='text-white cursor-pointer hover:text-orange-400 transition-colors' size={22} />
                    </div>

                    <div className='flex-1 overflow-y-auto scroll p-5 space-y-3 min-h-0'>
                        <input
                            type='text'
                            value={formData.name}
                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder='Exercise name'
                            className='w-full bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2.5 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 font-mono text-sm'
                        />
                        <div>
                            <p className='text-[10px] font-mono tracking-widest text-orange-500/50 mb-1'>CATEGORY</p>
                            <ThemedSelect
                                value={formData.category}
                                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                                options={CATEGORIES.map(c => ({ value: c, label: c }))}
                            />
                        </div>
                        <div>
                            <p className='text-[10px] font-mono tracking-widest text-orange-500/50 mb-1'>MODE</p>
                            <ThemedSelect
                                value={formData.mode}
                                onChange={e => setFormData(p => ({ ...p, mode: e.target.value }))}
                                options={MODES.map(m => ({ value: m.key, label: m.label }))}
                            />
                        </div>
                        <div>
                            <p className='text-[10px] font-mono tracking-widest text-orange-500/50 mb-1'>TARGET MUSCLE</p>
                            <input
                                type='text'
                                value={formData.muscle}
                                onChange={e => setFormData(p => ({ ...p, muscle: e.target.value }))}
                                placeholder='Optional'
                                className='w-full bg-black/50 border border-orange-500/30 rounded-lg px-3 py-2.5 text-white placeholder-orange-500/50 outline-none focus:border-orange-500 font-mono text-sm'
                            />
                        </div>
                        {saveError && (
                            <p className='text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/30 rounded-lg p-2'>{saveError}</p>
                        )}
                        <div className='flex gap-2 pt-1'>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.name.trim()}
                                className='flex items-center gap-1 bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer'
                            >
                                <Check size={16} /> {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                            </button>
                            <button
                                onClick={resetForm}
                                className='flex items-center gap-1 border border-neutral-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-neutral-800 transition-colors cursor-pointer'
                            >
                                <X size={16} /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ExercisesList
