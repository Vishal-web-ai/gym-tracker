import { useState, useLayoutEffect, useEffect, useRef } from 'react'
import { Camera, Video, StickyNote, Trash2, X, Plus, Minus, Save, Check } from 'lucide-react'
import NumberOfSets from './NumberOfSets'
import ExerciseMedia from './ExerciseMedia'
import RestTimer from './RestTimer'
import { createSession, getRestSound } from '../services/storage'
import { addMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'

const WeightCell = ({ value, onChange }) => (
    <input
        type='text'
        inputMode='decimal'
        value={value}
        onChange={(e) => {
            const v = e.target.value
            if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v)
        }}
        placeholder='0'
        className='w-full h-9 bg-black/30 border border-white/15 rounded-xl text-center font-bebas text-orange-400 text-lg outline-none placeholder-orange-400/40'
    />
)

const ExerciseCard = ({ exercise, idx, enterDir, onRemove, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, exerciseDone, exerciseSetCount, setWeight, setReps, setNotes, setMedia, setDone, setSetCount, showNotes, setShowNotes, sound, canPrev, canNext, onGoPrev, onGoNext }) => {
    const photoRef = useRef(null)
    const videoRef = useRef(null)
    const cardRef = useRef(null)
    const glowRef = useRef(null)
    const [busy, setBusy] = useState(false)
    const nameRef = useRef(null)
    const setsScrollRef = useRef(null)
    const dragRef = useRef(null)
    const rafRef = useRef(null)
    const snapTimerRef = useRef(null)
    const isTimer = exercise.mode === 'timer'
    const setCount = Math.max(3, Math.min(10, exerciseSetCount?.[idx] || 3))
    const prevSetCount = useRef(setCount)
    const width = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 375))[0]
    const gutter = 12
    const CW = Math.max(200, width - gutter * 2)
    const shift = CW - 40

    const setCardTransform = (px, ms = 0) => {
        const el = cardRef.current
        if (!el) return
        const prog = Math.min(1, Math.abs(px) / shift)
        el.style.transition = ms > 0 ? `transform ${ms}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none'
        el.style.transform = `translateX(${px}px) scale(${1 - 0.03 * prog})`
        if (glowRef.current) glowRef.current.style.opacity = 0.55 * prog
    }

    const snapBack = () => setCardTransform(0, 220)

    const handlePointerDown = (e) => {
        if (e.target.closest('button, input, textarea')) return
        const el = cardRef.current
        if (!el) return
        clearTimeout(snapTimerRef.current)
        dragRef.current = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: performance.now(), vx: 0 }
        try { el.setPointerCapture(e.pointerId) } catch { /* pointer capture is optional */ }
        el.style.transition = 'none'
    }

    const handlePointerMove = (e) => {
        const d = dragRef.current
        if (!d || d.id !== e.pointerId) return
        const now = performance.now()
        const dt = Math.max(1, now - d.lastT)
        d.vx = 0.6 * d.vx + 0.4 * ((e.clientX - d.lastX) / dt * 1000)
        d.lastX = e.clientX
        d.lastT = now
        d.dx = e.clientX - d.startX
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            const limit = shift
            let px = d.dx
            if (px > limit) px = limit + (px - limit) * 0.35
            else if (px < -limit) px = -limit - (px + limit) * 0.35
            setCardTransform(px)
        })
    }

    const handlePointerUp = (e) => {
        const d = dragRef.current
        if (!d || d.id !== e.pointerId) return
        dragRef.current = null
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        const dx = e.clientX - d.startX
        if ((dx < -60 || d.vx < -500) && canNext) {
            setCardTransform(-shift, 200)
            snapTimerRef.current = setTimeout(onGoNext, 170)
        } else if ((dx > 60 || d.vx > 500) && canPrev) {
            setCardTransform(shift, 200)
            snapTimerRef.current = setTimeout(onGoPrev, 170)
        } else {
            snapBack()
        }
    }

    const handlePointerCancel = (e) => {
        const d = dragRef.current
        if (!d || d.id !== e.pointerId) return
        dragRef.current = null
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        snapBack()
    }

    useLayoutEffect(() => {
        const el = cardRef.current
        if (!el) return
        const from = enterDir === 'prev' ? -shift : shift
        el.style.transition = 'none'
        el.style.transform = `translateX(${from}px)`
        const raf = requestAnimationFrame(() => {
            el.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)'
            el.style.transform = 'translateX(0px)'
        })
        return () => cancelAnimationFrame(raf)
    }, [shift, enterDir])

    useLayoutEffect(() => {
        const el = setsScrollRef.current
        if (el && setCount > prevSetCount.current) {
            el.scrollTop = el.scrollHeight
        }
        prevSetCount.current = setCount
    }, [setCount])

    useLayoutEffect(() => {
        const el = nameRef.current
        if (!el) return
        const fit = () => {
            el.style.fontSize = '30px'
            const cs = getComputedStyle(el)
            const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
            const range = document.createRange()
            range.selectNodeContents(el)
            const needed = range.getBoundingClientRect().width
            const available = Math.max(el.clientWidth - pad - 8, 40)
            const scale = needed > available ? Math.max(0.35, available / needed) : 1
            el.style.fontSize = `${30 * scale}px`
        }
        fit()
        if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {})
    }, [exercise.name])

    const onAdd = (item) => setMedia(prev => ({
        ...prev,
        [idx]: [...(prev[idx] || []), item]
    }))

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || [])
        e.target.value = ''
        if (!files.length) return
        setBusy(true)
        try {
            for (const file of files) {
                onAdd(await addMedia({ file }))
            }
        } catch (err) {
            alert(getErrorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            ref={cardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className='absolute top-0 bottom-0 left-3 right-3 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-2xl overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing shadow-[0_20px_45px_rgba(0,0,0,0.6)]'
        >
            <div
                ref={glowRef}
                className='absolute inset-0 pointer-events-none rounded-3xl'
                style={{
                    opacity: 0,
                    background: 'radial-gradient(120% 90% at 50% 50%, rgba(249,115,22,0.12), transparent 70%)'
                }}
            />
            <div
                className='absolute inset-0 pointer-events-none'
                style={{
                    background: 'radial-gradient(110% 85% at 90% 100%, rgba(255,255,255,0.06) 0%, transparent 62%), radial-gradient(80% 55% at 0% 0%, rgba(255,255,255,0.04) 0%, transparent 55%)'
                }}
            />
            {/* Glass shine — top highlight + inner glow + diagonal streak */}
            <div
                className='absolute inset-0 pointer-events-none rounded-3xl'
                style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 50px rgba(255,255,255,0.05)'
                }}
            />
            <div
                className='absolute inset-x-0 top-0 h-2/5 pointer-events-none'
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent)' }}
            />
            <div
                className='absolute inset-0 pointer-events-none'
                style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.07) 42%, transparent 56%)' }}
            />
            <div className='relative flex flex-col h-full px-4 py-2.5'>
                {/* Title row + trash */}
                <div className='relative'>
                    <h1
                        ref={nameRef}
                        className='absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-bebas text-orange-400 text-[30px] leading-none tracking-[1px] whitespace-nowrap overflow-hidden text-ellipsis px-12'
                    >
                        {exercise.name}
                    </h1>
                    <button
                        onClick={() => onRemove(idx)}
                        className='relative z-10 ml-auto flex w-9 h-9 rounded-lg border border-white/20 bg-white/5 items-center justify-center cursor-pointer hover:bg-white/15 transition-all shrink-0'
                        title='Remove exercise'
                    >
                        <Trash2 size={15} className='text-white/70' />
                    </button>
                </div>

                {/* Action buttons + media pill — centered below the name */}
                <div className='flex flex-wrap items-center justify-center gap-2 mt-1.5'>
                    <button
                        onClick={() => photoRef.current?.click()}
                        disabled={busy}
                        className='w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center cursor-pointer hover:border-orange-400/60 hover:text-orange-300 transition-all disabled:opacity-50'
                        title='Take photo'
                    >
                        <Camera size={16} className='text-white/70' />
                    </button>
                    <button
                        onClick={() => videoRef.current?.click()}
                        disabled={busy}
                        className='w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center cursor-pointer hover:border-orange-400/60 hover:text-orange-300 transition-all disabled:opacity-50'
                        title='Record video'
                    >
                        <Video size={16} className='text-white/70' />
                    </button>
                    <button
                        onClick={() => setShowNotes(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className='w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center cursor-pointer hover:border-orange-400/60 hover:text-orange-300 transition-all'
                        title='Notes'
                    >
                        <StickyNote size={15} className='text-white/70' />
                    </button>
                    <ExerciseMedia
                        media={exerciseMedia?.[idx] || []}
                        onDelete={(mediaIdx) => setMedia(prev => ({
                            ...prev,
                            [idx]: (prev[idx] || []).filter((_, i) => i !== mediaIdx)
                        }))}
                    />
                    <input
                        ref={photoRef}
                        type='file'
                        accept='image/*'
                        capture='environment'
                        onChange={handleFiles}
                        className='hidden'
                    />
                    <input
                        ref={videoRef}
                        type='file'
                        accept='video/*'
                        capture='environment'
                        onChange={handleFiles}
                        className='hidden'
                    />
                </div>

                {/* Notes — opens below the icon row, above the sets */}
                {showNotes[idx] && (
                    <textarea
                        value={exerciseNotes?.[idx] || ''}
                        onChange={(e) => setNotes(idx, e.target.value)}
                        onInput={(e) => {
                            e.target.style.height = 'auto'
                            e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        placeholder="Notes..."
                        rows={1}
                        className='w-full bg-black/30 text-white text-sm border border-orange-500/25 rounded-xl px-3 py-2 mt-3 outline-none focus:border-orange-400 placeholder-neutral-500 resize-none overflow-hidden transition-all duration-300'
                    />
                )}

                {/* Set input rows — scrollable when they don't fit */}
                <div
                    ref={setsScrollRef}
                    className='flex-initial min-h-0 overflow-y-auto scroll mt-1.5'
                >
                    <div className='flex flex-col gap-1.5'>
                        {Array.from({ length: setCount }, (_, setIdx) => {
                            const done = !!exerciseDone[idx]?.[setIdx]
                            return (
                                <div key={setIdx} className='flex items-center gap-2.5'>
                                    <div className='w-7 h-7 rounded-full border border-orange-500/40 flex items-center justify-center shrink-0'>
                                        <span className='font-bebas text-orange-400 text-base leading-none'>{setIdx + 1}</span>
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <label className='block text-[9px] font-bold text-neutral-500 mb-0.5 tracking-[2px]'>
                                            {isTimer ? 'TIME' : 'REPS'}
                                        </label>
                                        {isTimer ? (
                                            <NumberOfSets
                                                mode='timer'
                                                reps={exerciseSets[idx]?.[setIdx] || ''}
                                                setReps={(_, val) => setReps(idx, setIdx, val)}
                                                idx={setIdx}
                                                className='h-9'
                                            />
                                        ) : (
                                            <input
                                                type='text'
                                                inputMode='numeric'
                                                value={exerciseSets[idx]?.[setIdx] || ''}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    if (v === '' || /^\d+$/.test(v)) setReps(idx, setIdx, v)
                                                }}
                                                placeholder='0'
className='w-full h-9 bg-black/30 border border-white/15 rounded-xl text-center font-bebas text-orange-400 text-lg outline-none placeholder-orange-400/40'
                                            />
                                        )}
                                    </div>
                                    {!isTimer && (
                                        <div className='flex-1 min-w-0'>
<label className='block text-[9px] font-bold text-neutral-500 mb-0.5 tracking-[2px]'>
                                            WEIGHT (KG)
                                        </label>
                                        <WeightCell
                                            value={exerciseWeights[idx]?.[setIdx] || ''}
                                            onChange={(val) => setWeight(idx, setIdx, val)}
                                        />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setDone(idx, setIdx, !done)}
className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${done
                                        ? 'border-white bg-white/20'
                                        : 'border-neutral-600 hover:border-neutral-400 hover:bg-white/5'
                                        }`}
                                    title={done ? 'Mark set incomplete' : 'Mark set complete'}
                                >
                                    <Check size={15} className={done ? 'text-white' : 'text-transparent'} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Add / remove set controls — fixed below the scrollable area */}
                <div className='flex items-center justify-center gap-2 pt-1.5'>
                    <button
                        onClick={() => setSetCount(idx, Math.min(10, setCount + 1))}
                        disabled={setCount >= 10}
                        className='flex items-center gap-1 px-3 py-1.5 rounded-full border border-orange-500/35 text-orange-400/90 text-[10px] font-bold tracking-[2px] cursor-pointer hover:bg-orange-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
                        title={setCount >= 10 ? 'Maximum of 10 sets' : 'Add a set'}
                    >
                        <Plus size={12} /> ADD SET
                    </button>
                    {setCount > 3 && (
                        <button
                            onClick={() => setSetCount(idx, setCount - 1)}
                            className='flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/25 text-white/70 text-[10px] font-bold tracking-[2px] cursor-pointer hover:bg-white/10 transition-all'
                            title='Remove last set'
                        >
                            <Minus size={12} /> REMOVE SET
                        </button>
                    )}
                </div>

                {/* Rest timer — always pinned to the bottom */}
                <div className='mt-auto pt-1.5'>
                    <RestTimer sound={sound} />
                </div>
            </div>
        </div>
    )
}

const SessionTracker = ({ exercises = [], plannedExercises = [], onRemove, onAddExercises, onSessionSaved, onJumpToExercise, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, exerciseDone, exerciseSetCount, setWeight, setReps, setNotes, setMedia, setDone, setSetCount, currentIndex, setCurrentIndex, showNotes, setShowNotes }) => {
    const [showNameModal, setShowNameModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [workoutName, setWorkoutName] = useState('')
    const [restSound, setRestSound] = useState(null)
    const [enterDir, setEnterDir] = useState('next')

    useEffect(() => {
        getRestSound().then(s => { if (s) setRestSound(s) }).catch(() => {})
    }, [])

    const current = exercises.length === 0 ? 0 : Math.min(currentIndex, exercises.length - 1)
    const isLast = current === exercises.length - 1
    const selectedCount = plannedExercises.filter(ex => exercises.some(e => e.id === ex.id)).length

    const handleSaveClick = () => {
        setWorkoutName('')
        setShowNameModal(true)
    }
    const handleConfirmSave = async () => {
        if (exercises.length === 0) return
        setShowNameModal(false)
        const now = new Date()
        const isTimer = (idx) => exercises[idx].mode === 'timer'
        try {
            const session = await createSession({
                date: now.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }),
                name: workoutName.trim() || 'Workout',
                exercises: exercises.map((exercise, idx) => ({
                    name: exercise.name,
                    mode: exercise.mode === 'timer' ? 'timer' : 'weight',
                    sets: Array.from({ length: Math.max(3, Math.min(10, exerciseSetCount?.[idx] || 3)) }, (_, setIdx) => ({
                        reps: exerciseSets[idx]?.[setIdx] || '—',
                        weight: isTimer(idx) ? '—' : (exerciseWeights[idx]?.[setIdx] ? `${exerciseWeights[idx][setIdx]}kg` : '—')
                    })),
                    notes: exerciseNotes?.[idx] || '',
                    media: exerciseMedia?.[idx] || []
                }))
            })
            if (onSessionSaved) onSessionSaved(workoutName.trim() || 'Workout', session)
        } catch (err) {
            alert(getErrorMessage(err))
            setShowNameModal(true)
        }
    }

    return (
        <div className='w-full md:w-3/4 h-full flex justify-center'>
            <div className='flex flex-col h-full w-full'>
                {/* Exercise progress */}
                <div className='shrink-0 flex flex-col items-center gap-2 px-5 pt-4 pb-1'>
                    <button
                        onClick={() => setShowPreview(true)}
                        title='View all exercises'
                        className='font-bebas tracking-[3px] text-[15px] cursor-pointer hover:opacity-90 transition-opacity'
                    >
                        <span className='text-orange-500'>EXERCISE</span>
                        <span className='text-neutral-400'> {current + 1} OF {exercises.length}</span>
                    </button>
                    <div className='flex gap-1.5'>
                        {exercises.map((ex, i) => (
                            <button
                                key={ex.id}
                                onClick={() => onJumpToExercise(ex.id)}
                                title={ex.name}
                                className={`h-[3px] rounded-full w-5 transition-all cursor-pointer ${i === current
                                    ? 'bg-orange-500'
                                    : 'bg-neutral-800 hover:bg-neutral-600'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Main exercise card — deck of prev / current / next */}
                <div className='relative flex-1 min-h-0 mt-3 mb-3 overflow-hidden'>
                    {exercises.length > 0 ? (
                        <ExerciseCard
                            key={exercises[current].id}
                            enterDir={enterDir}
                            exercise={exercises[current]}
                            idx={current}
                            onRemove={onRemove}
                            exerciseWeights={exerciseWeights}
                            exerciseSets={exerciseSets}
                            exerciseNotes={exerciseNotes}
                            exerciseMedia={exerciseMedia}
                            exerciseDone={exerciseDone}
                            exerciseSetCount={exerciseSetCount}
                            setWeight={setWeight}
                            setReps={setReps}
                            setNotes={setNotes}
                            setMedia={setMedia}
                            setDone={setDone}
                            setSetCount={setSetCount}
                            showNotes={showNotes}
                            setShowNotes={setShowNotes}
                            sound={restSound}
                            canPrev={current > 0}
                            canNext={!isLast}
                            onGoPrev={() => { setEnterDir('prev'); setCurrentIndex(current - 1) }}
                            onGoNext={() => { setEnterDir('next'); setCurrentIndex(current + 1) }}
                        />
                    ) : (
                        <div className='h-full flex flex-col items-center justify-center'>
                            <p className='text-orange-500/50 tracking-wide text-center font-mono'>
                                No exercises yet. Tap "Add Exercises" to start.
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom action bar */}
                <div className='shrink-0 px-4 pt-3 pb-5 flex gap-3'>
                    <button
                        onClick={onAddExercises}
                        className='flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-3xl py-3 cursor-pointer hover:bg-white/15 transition-all duration-300 active:scale-95'
                    >
                        <Plus size={15} className='text-orange-400' />
                        <span className='font-bebas text-orange-400 text-[13px] tracking-[1px]'>ADD MORE EXERCISES</span>
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={exercises.length === 0}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 backdrop-blur-3xl transition-all duration-300 ${exercises.length === 0
                            ? 'bg-white/5 cursor-not-allowed'
                            : 'bg-orange-400/25 cursor-pointer hover:bg-orange-400/35 active:scale-95 shadow-[0_0_30px_rgba(249,115,22,0.45),inset_0_0_14px_rgba(255,255,255,0.15)]'
                            }`}
                    >
                        <Save size={15} className={exercises.length === 0 ? 'text-white/40' : 'text-orange-300'} />
                        <span className={`font-bebas text-[13px] tracking-[1px] ${exercises.length === 0 ? 'text-white/40' : 'text-orange-300'}`}>
                            SAVE WORKOUT
                        </span>
                    </button>
                </div>
            </div>

            {/* Name Modal */}
            {showNameModal && (
                <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'>
                    <div className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'>
                        <h2 className='text-white text-xl font-bold font-mono mb-4'>Name this workout</h2>
                        <input
                            type='text'
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            placeholder='e.g. Chest Day, Push Day...'
                            className='w-full bg-neutral-900 text-white border border-orange-500/30 rounded-xl px-4 py-3 font-mono outline-none focus:border-orange-500 placeholder-neutral-500'
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmSave()
                            }}
                        />
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowNameModal(false)}
                                className='flex-1 border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                className='flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPreview && (
                <div
                    className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-5 w-full max-w-sm max-h-[75vh] overflow-y-auto scroll animate-popIn'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-white text-lg font-bold font-mono'>Workout Preview</h2>
                            <button
                                onClick={() => setShowPreview(false)}
                                className='text-neutral-400 hover:text-white transition-colors cursor-pointer'
                                title='Close'
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <p className='text-neutral-400 text-xs mb-3 font-mono'>
                            {selectedCount} of {plannedExercises.length} exercises
                        </p>
                        <ul className='flex flex-col gap-2'>
                            {plannedExercises.map((ex, i) => {
                                const sessionIdx = exercises.findIndex(e => e.id === ex.id)
                                const isCurrent = sessionIdx === current
                                const isDeleted = sessionIdx === -1
                                return (
                                    <li
                                        key={ex.id}
                                        onClick={() => {
                                            setShowPreview(false)
                                            onJumpToExercise(ex.id)
                                        }}
                                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all duration-200 ${isCurrent
                                            ? 'border-orange-500 bg-orange-500/20'
                                            : isDeleted
                                                ? 'border-neutral-700 bg-neutral-900 opacity-50 hover:opacity-80'
                                                : 'border-neutral-700 bg-neutral-900 hover:border-orange-500/50'
                                            }`}
                                    >
                                        <span className='font-bebas text-orange-500 text-lg w-6 text-center shrink-0'>{i + 1}</span>
                                        <span className='flex-1 text-white font-semibold truncate'>{ex.name}</span>
                                        {isCurrent && <span className='text-orange-400 text-xs font-mono shrink-0'>CURRENT</span>}
                                        {isDeleted && <span className='text-neutral-500 text-xs font-mono shrink-0'>RE-ADD</span>}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SessionTracker