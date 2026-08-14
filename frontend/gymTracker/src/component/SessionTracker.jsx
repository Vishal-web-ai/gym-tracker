import { useState, useLayoutEffect, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { Camera, Video, StickyNote, Trash2 } from 'lucide-react'
import NumberOfSets from './NumberOfSets'
import ExerciseMedia from './ExerciseMedia'
import RestTimer from './RestTimer'
import { createSession, getRestSound } from '../services/storage'
import { addMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'

const SET_INDICES = [0, 1, 2]

const WeightCell = ({ value, onChange }) => (
    <input
        type='text'
        inputMode='numeric'
        value={value}
        onChange={(e) => {
            const v = e.target.value
            if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v)
        }}
        placeholder='0'
        className='w-[clamp(34px,11vw,38px)] h-[30px] bg-black text-orange-500 rounded-lg text-center text-sm font-bold outline-none placeholder-orange-500/40'
    />
)

const ExerciseCard = ({ exercise, idx, current, activeRef, onRemove, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, setWeight, setReps, setNotes, setMedia, showNotes, setShowNotes, sound }) => {
    const x = useMotionValue(0)
    const panelOpacity = useTransform(x, [-120, -60, 0], [1, 1, 0])
    const photoRef = useRef(null)
    const videoRef = useRef(null)
    const [busy, setBusy] = useState(false)
    const isTimer = exercise.mode === 'timer'

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
        <div className='relative'>
            <motion.div
                style={{ opacity: panelOpacity }}
                className='absolute inset-y-0 right-0 w-28 bg-red-500 rounded-lg flex items-center justify-center gap-1.5 pointer-events-none'
            >
                <Trash2 size={20} color='white' />
                <span className='text-white text-lg font-bold tracking-wide'>DELETE</span>
            </motion.div>
            <motion.div
                ref={idx === current ? activeRef : undefined}
                initial={{ opacity: 0, x: 200 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -200, transition: { duration: 0.25 } }}
                transition={{ x: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.3 } }}
            >
                <motion.div
                    style={{ x }}
                    drag='x'
                    dragConstraints={{ left: -120, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={(e, info) => {
                        if (info.offset.x < -95 || info.velocity.x < -500) {
                            onRemove(idx)
                        }
                    }}
                    className='flex flex-col gap-3 p-3 rounded-lg border border-orange-500/50 bg-orange-500/10 cursor-grab active:cursor-grabbing touch-pan-y'
                >
                    <div className='flex items-center justify-between gap-2'>
                        <h2 className='font-bebas text-orange-500 text-2xl flex-1 min-w-0 truncate'>
                            {exercise.name}
                        </h2>
                        <div className='flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1 shrink-0'>
                            <button
                                onClick={() => photoRef.current?.click()}
                                disabled={busy}
                                className='cursor-pointer hover:text-orange-300 transition-all disabled:opacity-50'
                                title='Take photo'
                            >
                                <Camera size={20} />
                            </button>
                            <button
                                onClick={() => videoRef.current?.click()}
                                disabled={busy}
                                className='cursor-pointer hover:text-orange-300 transition-all disabled:opacity-50'
                                title='Record video'
                            >
                                <Video size={20} />
                            </button>
                            <button
                                onClick={() => setShowNotes(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                className='cursor-pointer hover:text-orange-300 transition-all'
                                title='Notes'
                            >
                                <StickyNote size={17} />
                            </button>
                        </div>
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
                    <div className='flex items-center gap-1'>
                        <span className='text-neutral-400 text-xs tracking-wide shrink-0' style={{ width: 'clamp(32px, 11vw, 48px)' }}>
                            SETS
                        </span>
                        <div className='flex items-center gap-2 sm:gap-3'>
                            {SET_INDICES.map(setIdx => (
                                <NumberOfSets
                                    key={setIdx}
                                    reps={exerciseSets[idx]?.[setIdx] || ''}
                                    setReps={(_, val) => setReps(idx, setIdx, val)}
                                    idx={setIdx}
                                    placeholder={isTimer ? 'T' : 'R'}
                                    mode={isTimer ? 'timer' : 'weight'}
                                />
                            ))}
                        </div>
                        <RestTimer sound={sound} />
                    </div>
                    {!isTimer && (
                        <div className='flex items-center gap-1'>
                            <span className='text-neutral-400 text-xs tracking-wide shrink-0' style={{ width: 'clamp(32px, 11vw, 48px)' }}>
                                WEIGHT
                            </span>
                            <div className='flex items-center gap-2 sm:gap-3'>
                                {SET_INDICES.map(setIdx => (
                                    <WeightCell
                                        key={setIdx}
                                        value={exerciseWeights[idx]?.[setIdx] || ''}
                                        onChange={(val) => setWeight(idx, setIdx, val)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <ExerciseMedia
                        media={exerciseMedia?.[idx] || []}
                        onDelete={(mediaIdx) => setMedia(prev => ({
                            ...prev,
                            [idx]: (prev[idx] || []).filter((_, i) => i !== mediaIdx)
                        }))}
                    />
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
                            className='w-full bg-neutral-900 text-white text-sm border border-orange-500/30 rounded-lg px-3 py-2 outline-none focus:border-orange-500 placeholder-neutral-500 resize-none overflow-hidden transition-all duration-300'
                        />
                    )}
                </motion.div>
            </motion.div>
        </div>
    )
}

const SessionTracker = ({ exercises = [], onRemove, onAddExercises, onSessionSaved, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, setWeight, setReps, setNotes, setMedia, currentIndex, setCurrentIndex, showNotes, setShowNotes }) => {
    const [showNameModal, setShowNameModal] = useState(false)
    const [workoutName, setWorkoutName] = useState('')
    const [restSound, setRestSound] = useState(null)
    const activeRef = useRef(null)

    useEffect(() => {
        getRestSound().then(s => { if (s) setRestSound(s) }).catch(() => {})
    }, [])

    const current = exercises.length === 0 ? 0 : Math.min(currentIndex, exercises.length - 1)
    const isLast = current === exercises.length - 1

    useLayoutEffect(() => {
        if (exercises.length > 0 && activeRef.current) {
            const el = activeRef.current
            const container = el.closest('.scroll')
            if (container) {
                const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
                container.scrollTop = top
            }
        }
    }, [current, exercises.length])

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
                    sets: SET_INDICES.map(setIdx => ({
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
                <div className='flex-1 overflow-y-auto px-5 sm:px-7 scroll'>
                    {exercises.length > 0 ? (
                        <>
                            <div className='flex flex-col gap-3 font-semibold font-mono text-base sm:text-lg'>
                                <div className='flex items-center justify-center overflow-hidden'>
                                    <motion.p
                                        key={current}
                                        initial={{ opacity: 0, x: -40 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ x: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.25 } }}
                                        className='font-bebas text-orange-500 tracking-[2px] text-sm sm:text-base'
                                    >
                                        EXERCISE {current + 1} <span className='text-white/50'>/ {exercises.length}</span>
                                    </motion.p>
                                </div>
                                <AnimatePresence initial={false}>
                                    {exercises.slice(0, current + 1).map((exercise, idx) => (
                                        <ExerciseCard
                                            key={idx}
                                            exercise={exercise}
                                            idx={idx}
                                            current={current}
                                            activeRef={activeRef}
                                            onRemove={onRemove}
                                            exerciseWeights={exerciseWeights}
                                            exerciseSets={exerciseSets}
                                            exerciseNotes={exerciseNotes}
                                            exerciseMedia={exerciseMedia}
                                            setWeight={setWeight}
                                            setReps={setReps}
                                            setNotes={setNotes}
                                            setMedia={setMedia}
                                            showNotes={showNotes}
                                            setShowNotes={setShowNotes}
                                            sound={restSound}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                            {!isLast && (
                                <button
                                    onClick={() => setCurrentIndex(current + 1)}
                                    disabled={exercises.length === 0}
                                    className={`mt-[8px] mx-auto w-1/2 block text-center border border-orange-500 bg-orange-500 text-black font-bold px-5 py-1.5 sm:py-2 text-xl sm:text-2xl rounded-xl transition-all duration-300 font-bebas tracking-[2px] ${exercises.length === 0
                                        ? 'opacity-30 cursor-not-allowed'
                                        : 'cursor-pointer hover:scale-105 hover:bg-orange-400 hover:shadow-orange-500/50 hover:shadow-lg active:scale-95'
                                        }`}
                                >
                                    Next Exercise
                                </button>
                            )}
                        </>
                    ) : (
                        <p className='text-orange-500/50 tracking-wide text-center py-10'>
                            No exercises yet. Tap "Add Exercises" to start.
                        </p>
                    )}
                </div>

                <div className='shrink-0 px-5 sm:px-7 pb-5 sm:pb-7 pt-3 flex flex-col gap-3'>
                    <div className='flex gap-3'>
                        <button
                            onClick={onAddExercises}
                            className='flex-1 border border-orange-500/40 text-orange-500 font-bold px-4 py-1.5 text-sm sm:text-base rounded-xl transition-all duration-300 font-bebas tracking-[2px] cursor-pointer hover:bg-orange-500/10 active:scale-95'
                        >
                            Add More Exercises
                        </button>
                        <button
                            onClick={handleSaveClick}
                            disabled={exercises.length === 0}
                            className={`flex-1 border border-orange-500/40 text-orange-500 font-bold px-4 py-1.5 text-sm sm:text-base rounded-xl transition-all duration-300 font-bebas tracking-[2px] ${exercises.length === 0
                                ? 'opacity-30 cursor-not-allowed'
                                : 'cursor-pointer hover:bg-orange-500/10 active:scale-95'
                                }`}
                        >
                            Save
                        </button>
                    </div>
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
        </div>
    )
}

export default SessionTracker
