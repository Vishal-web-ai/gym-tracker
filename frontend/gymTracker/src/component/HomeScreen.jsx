import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiMenuLine, RiCloseLine } from '@remixicon/react'
import { Check, Zap, Edit3, Plus, BicepsFlexed, User, CalendarDays } from 'lucide-react'
import ExercisesList from './ExercisesList'
import SessionTracker from './SessionTracker'
import ExerciseDetail from './ExerciseDetail'
import StaggeredMenu from './StaggeredMenu'
import MediaGallery from './MediaGallery'
import WorkoutHistory from './WorkoutHistory'
import Settings from './Settings'
import GreetingUser from './GreetingUser'
import Streak from './Streak'
import PrsBadge from './PrsBadge'
import {
    getName,
    getSessions,
    getPrs,
    savePrs,
    getUserProfile,
    saveUserProfile,
    getSchedule,
    getTodaysExercises,
    computeMonthlyCount
} from '../services/storage'
import { deleteMedia } from '../services/media'
import { imageFileToDataUrl } from '../services/photo'

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 18, stiffness: 200 } }
}

const bottomVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 250 } }
}

const REST_MESSAGES = [
    'Your muscles grow while you rest — enjoy it.',
    'Even the strongest lifters take rest days.',
    'Rest day! Go touch some grass.',
    'Recovery is training too. Enjoy!',
    'Rest day! You earned it. The gym will survive.',
    'Rest day! Binge, snooze, and let the pump rest.'
]

const SESSION_KEY = 'gym-tracker-session-v1'

function HaloStack() {
    const halos = [
        { size: 288, opacity: 0.025 },
        { size: 192, opacity: 0.045 },
        { size: 112, opacity: 0.07 },
        { size: 56, opacity: 0.12 }
    ]
    return halos.map(({ size, opacity }) => (
        <div
            key={size}
            className='absolute rounded-full pointer-events-none'
            style={{
                width: size,
                height: size,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%,-50%)',
                backgroundColor: `rgba(249,115,22,${opacity})`
            }}
        />
    ))
}

function HaloCard({ children, className = '' }) {
    return (
        <div className='relative w-full h-full'>
            <HaloStack />
            <div className={`relative rounded-2xl w-full h-full bg-[rgba(10,10,10,0.85)] ${className}`}>
                {children}
            </div>
        </div>
    )
}

const modalInputClass =
    'w-full bg-neutral-900 text-white border border-orange-500/30 rounded-xl px-4 py-3 font-mono outline-none focus:border-orange-500 placeholder-neutral-500'

const normalizeWeights = (raw) => {
    const out = {}
    for (const [key, value] of Object.entries(raw || {})) {
        if (value && typeof value === 'object') out[key] = value
        else if (value) out[key] = { 0: value, 1: value, 2: value }
    }
    return out
}

const getSavedSession = () => {
    try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (!raw) return null
        const snap = JSON.parse(raw)
        if (!Array.isArray(snap.selectedExercises)) return null
        return snap
    } catch {
        return null
    }
}

const HomeScreen = () => {
    const [savedSession] = useState(getSavedSession)
    const [userName, setUserName] = useState('Vishal')
    const [showSession, setShowSession] = useState(() => !!savedSession)
    const [showExercisesList, setShowExercisesList] = useState(false)
    const [selectedExercises, setSelectedExercises] = useState(() => savedSession?.selectedExercises || [])
    const [previewExercise, setPreviewExercise] = useState(null)
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
    const [showGallery, setShowGallery] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [exerciseWeights, setExerciseWeights] = useState(() => savedSession ? normalizeWeights(savedSession.exerciseWeights) : {})
    const [exerciseSets, setExerciseSets] = useState(() => savedSession?.exerciseSets || {})
    const [exerciseNotes, setExerciseNotes] = useState(() => savedSession?.exerciseNotes || {})
    const [exerciseMedia, setExerciseMedia] = useState(() => savedSession?.exerciseMedia || {})
    const [showSuccess, setShowSuccess] = useState(false)
    const [savedWorkoutName, setSavedWorkoutName] = useState('')
    const [monthlyCount, setMonthlyCount] = useState(0)
    const [statKey, setStatKey] = useState(0)
    const [prs, setPrs] = useState([])
    const [showAddPr, setShowAddPr] = useState(false)
    const [showManagePr, setShowManagePr] = useState(false)
    const [editingPrIndex, setEditingPrIndex] = useState(null)
    const [prName, setPrName] = useState('')
    const [prWeight, setPrWeight] = useState('')
    const [prReps, setPrReps] = useState('')
    const [editPrName, setEditPrName] = useState('')
    const [editPrWeight, setEditPrWeight] = useState('')
    const [editPrReps, setEditPrReps] = useState('')
    const [photoData, setPhotoData] = useState('')
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [, setSchedule] = useState({})
    const [todayExercises, setTodayExercises] = useState([])
    const [currentIndex, setCurrentIndex] = useState(() => savedSession?.currentIndex || 0)
    const [showNotes, setShowNotes] = useState(() => savedSession?.showNotes || {})
    const photoInputRef = useRef(null)

    const restMessage = REST_MESSAGES[new Date().getDay() % REST_MESSAGES.length]

    const refreshStats = useCallback(() => {
        getSessions()
            .then(sessions => {
                setMonthlyCount(computeMonthlyCount(sessions))
            })
            .catch(() => {})
    }, [])

    const refreshTodaysSchedule = useCallback(() => {
        getSchedule()
            .then(schedule => {
                setSchedule(schedule || {})
                setTodayExercises(getTodaysExercises(schedule))
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        getName().then(setUserName).catch(() => {})
        getPrs().then(setPrs).catch(() => {})
        getUserProfile()
            .then(profile => setPhotoData(profile.photoData || ''))
            .catch(() => {})
        refreshTodaysSchedule()
        refreshStats()
    }, [refreshStats, refreshTodaysSchedule])

    useEffect(() => {
        if (!showSession) return
        try {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                selectedExercises,
                exerciseWeights,
                exerciseSets,
                exerciseNotes,
                exerciseMedia,
                currentIndex,
                showNotes
            }))
        } catch {
            // snapshot too large to persist; skip silently
        }
    }, [showSession, selectedExercises, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, currentIndex, showNotes])

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
            const data = await imageFileToDataUrl(file)
            await saveUserProfile({ photoData: data })
            setPhotoData(data)
            setShowPhotoModal(false)
        } catch {
            // ignore unreadable/unsupported image
        }
    }

    const handlePhotoRemove = async () => {
        try {
            await saveUserProfile({ photoData: '' })
            setPhotoData('')
            setShowPhotoModal(false)
        } catch {
            // ignore storage errors
        }
    }

    const setWeight = (exerciseIdx, setIdx, weight) => {
        setExerciseWeights(prev => ({
            ...prev,
            [exerciseIdx]: {
                ...prev[exerciseIdx],
                [setIdx]: weight
            }
        }))
    }

    const setNotes = (idx, note) => {
        setExerciseNotes(prev => ({ ...prev, [idx]: note }))
    }

    const setReps = (exerciseIdx, setIdx, value) => {
        setExerciseSets(prev => ({
            ...prev,
            [exerciseIdx]: {
                ...prev[exerciseIdx],
                [setIdx]: value
            }
        }))
    }

    const handleSelectExercise = (exercise) => {
        setPreviewExercise(exercise)
    }

    const handleConfirmExercise = (exercise) => {
        setSelectedExercises(prev => [...prev, { name: exercise.name }])
        setPreviewExercise(null)
        setShowExercisesList(false)
    }

    const handleCancelPreview = () => {
        setPreviewExercise(null)
    }

    const reindexMap = (map, removedIdx) =>
        Object.fromEntries(
            Object.entries(map)
                .map(([key, value]) => [parseInt(key, 10), value])
                .filter(([key]) => key !== removedIdx)
                .map(([key, value]) => [key > removedIdx ? key - 1 : key, value])
        )

    const handleRemoveExercise = (idx) => {
        const removedMedia = exerciseMedia[idx] || []
        setSelectedExercises(prev => prev.filter((_, i) => i !== idx))
        setExerciseWeights(prev => reindexMap(prev, idx))
        setExerciseSets(prev => reindexMap(prev, idx))
        setExerciseNotes(prev => reindexMap(prev, idx))
        setExerciseMedia(prev => reindexMap(prev, idx))
        setCurrentIndex(prev => (prev > idx ? prev - 1 : prev))
        removedMedia.forEach(m => deleteMedia(m.id).catch(() => {}))
    }

    const handleGoHome = () => {
        setShowSession(false)
        setShowExercisesList(false)
        setPreviewExercise(null)
        setIsHamburgerOpen(false)
    }

    const handleStartClick = () => {
        if (todayExercises.length > 0) {
            setSelectedExercises(todayExercises.map(e => ({ name: e.name })))
            setExerciseWeights({})
            setExerciseSets({})
            setExerciseNotes({})
            setExerciseMedia({})
        }
        setShowSession(true)
        setShowExercisesList(false)
    }

    const handleAddExercises = () => {
        setShowExercisesList(true)
    }

    const handleCloseExercises = () => {
        setShowExercisesList(false)
    }

    const handleSessionSaved = useCallback((name) => {
        try {
            localStorage.removeItem(SESSION_KEY)
        } catch {
            // ignore
        }
        setSelectedExercises([])
        setExerciseWeights({})
        setExerciseSets({})
        setExerciseNotes({})
        setExerciseMedia({})
        setCurrentIndex(0)
        setShowNotes({})
        setSavedWorkoutName(name)
        refreshStats()
        setStatKey(k => k + 1)
        setShowSuccess(true)
        setTimeout(() => {
            setShowSuccess(false)
            setShowSession(false)
            setSavedWorkoutName('')
        }, 1800)
    }, [refreshStats])

    const persistPrs = (next) => {
        setPrs(next)
        savePrs(next).catch(() => {})
    }

    const handleAddPr = () => {
        if (!prName.trim() || !prWeight.trim() || !prReps.trim()) return
        persistPrs([...prs, { name: prName.trim(), weight: prWeight.trim(), reps: prReps.trim() }])
        setPrName('')
        setPrWeight('')
        setPrReps('')
        setShowAddPr(false)
    }

    const handleEditPr = (idx) => {
        const pr = prs[idx]
        setEditingPrIndex(idx)
        setEditPrName(pr.name)
        setEditPrWeight(pr.weight)
        setEditPrReps(pr.reps)
    }

    const handleSaveEditPr = () => {
        if (editingPrIndex === null || !editPrName.trim() || !editPrWeight.trim() || !editPrReps.trim()) return
        persistPrs(prs.map((pr, i) =>
            i === editingPrIndex
                ? { name: editPrName.trim(), weight: editPrWeight.trim(), reps: editPrReps.trim() }
                : pr
        ))
        setEditingPrIndex(null)
        setEditPrName('')
        setEditPrWeight('')
        setEditPrReps('')
    }

    const handleDeletePr = (idx) => {
        persistPrs(prs.filter((_, i) => i !== idx))
    }

    const closeManagePr = () => {
        setEditingPrIndex(null)
        setShowManagePr(false)
    }

    const staggeredMenuItems = [
        { label: 'Workout History', ariaLabel: 'Open workout history', onClick: () => { setIsHamburgerOpen(false); setShowHistory(true) } },
        { label: 'Gym Memories', ariaLabel: 'Open gym memories gallery', onClick: () => { setIsHamburgerOpen(false); setShowGallery(true) } },
        { label: 'Settings', ariaLabel: 'Open settings', onClick: () => { setIsHamburgerOpen(false); setShowSettings(true) } }
    ]

    return (
        <div
            className='w-full h-full text-white flex flex-col overflow-hidden relative'
                        style={{ background: 'linear-gradient(to bottom right, #111111 45%, #9a3412 86%, #f97316 100%)' }}
        >
            {/* Header */}
            <header className='w-full flex items-center justify-center px-4 sm:px-5 h-16 sm:h-20 relative shrink-0'>
                <div className='absolute left-4 sm:left-5 cursor-pointer' onClick={() => setShowPhotoModal(true)} title='Profile photo'>
                    {photoData ? (
                        <img
                            src={photoData}
                            alt='Profile'
                            className='rounded-full border-2 border-orange-500 object-cover w-10 h-10 sm:w-12 sm:h-12'
                        />
                    ) : (
                        <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-orange-500/60 bg-[rgba(10,10,10,0.85)] flex items-center justify-center'>
                            <User size={18} className='text-orange-500' />
                        </div>
                    )}
                </div>
                <div className='flex items-center gap-2 border-2 border-orange-500/40 rounded-full bg-[rgba(10,10,10,0.85)] px-4 py-1.5 cursor-pointer' onClick={handleGoHome} title='Go to Home'>
                    <p className='font-bebas tracking-[2px] text-white text-lg leading-none pt-0.5'>GYM TRACKER</p>
                </div>
                <div
                    data-menu-toggle
                    aria-expanded={isHamburgerOpen}
                    aria-controls='staggered-menu-panel'
                    className='absolute right-4 sm:right-5 cursor-pointer z-40'
                    onClick={() => setIsHamburgerOpen(v => !v)}
                >
                    {isHamburgerOpen ? (
                        <RiCloseLine color="white" size={36} className='sm:size-[50]' />
                    ) : (
                        <RiMenuLine color="white" size={36} className='sm:size-[50]' />
                    )}
                </div>
            </header>

            {/* Landing view */}
            <motion.div
                className='relative z-10 flex-1 overflow-hidden'
                animate={{ opacity: showSession ? 0 : 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className='h-full flex flex-col'>
                    <div className='flex flex-col items-center gap-2 w-full px-4 sm:px-10 pt-5 pb-3'>
                        <motion.div variants={cardVariants} initial="hidden" animate="show" className='w-full max-w-lg h-[105px]'>
                            <HaloCard>
                                <div className='px-6 py-3 h-full flex flex-col justify-center'>
                                    <GreetingUser name={userName} />
                                </div>
                            </HaloCard>
                        </motion.div>

                        <motion.div variants={cardVariants} initial="hidden" animate="show" className='w-full max-w-lg h-[105px]'>
                            <HaloCard className='border border-orange-500/30'>
                                <div className='px-4 py-2 h-full flex flex-col justify-center'>
                                    <Streak refreshKey={statKey} />
                                </div>
                            </HaloCard>
                        </motion.div>

                        <motion.div variants={cardVariants} initial="hidden" animate="show" className='w-full flex gap-3 max-w-lg h-[105px]'>
                            <div className='flex-[0.4] border border-orange-500/30 rounded-2xl bg-[rgba(10,10,10,0.85)] px-4 py-2.5 flex flex-col items-center justify-center gap-1'>
                                <div className='flex items-center gap-3'>
                                    <div className='border border-orange-500/50 rounded-full w-7 h-7 flex items-center justify-center'>
                                        <BicepsFlexed size={16} className='text-orange-500' fill='#f97316' />
                                    </div>
                                    <div>
                                        <p className='font-inter text-white/40 tracking-[1px] text-[6px]'>WORKOUT IN</p>
                                        <p className='font-inter text-white/40 tracking-[1px] text-[6px]'>THIS MONTH</p>
                                    </div>
                                </div>
                                <p className='font-bebas text-orange-500 tracking-[2px] text-4xl leading-none'>{monthlyCount}</p>
                                <p className='font-inter font-bold text-white/50 tracking-[1px] text-[11px] -mt-1'>Days</p>
                            </div>

                            <div className='flex-[0.6] border border-orange-500/30 rounded-2xl bg-[rgba(10,10,10,0.85)] px-4 py-2.5 flex flex-col justify-center'>
                            <div className='flex items-center justify-between w-full mb-2'>
                                <PrsBadge />
                                <div className='flex items-center gap-2'>
                                    <button onClick={() => setShowManagePr(true)} className='p-1 cursor-pointer' title='Manage PRs'>
                                        <Edit3 size={14} className='text-orange-500' />
                                    </button>
                                    <button onClick={() => setShowAddPr(true)} className='bg-orange-500 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer' title='Add PR'>
                                        <Plus size={14} className='text-black font-bold' />
                                    </button>
                                </div>
                            </div>
                            {prs.length === 0 ? (
                                <p className='font-inter text-white/30 italic text-center w-full text-xs'>Write your PR here</p>
                            ) : (
                                <div className='max-h-20 overflow-y-auto scroll flex flex-col gap-1'>
                                    {prs.map((pr, i) => (
                                        <div key={i} className='flex justify-between items-center w-full'>
                                            <p className='font-mono text-gray-300 flex-1 truncate text-[10px]'>{pr.name}</p>
                                            <p className='font-mono text-gray-300 text-[10px]'>{pr.weight}kg × {pr.reps}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                    </div>

                    <motion.div variants={bottomVariants} initial="hidden" animate="show" className='flex flex-col items-center w-full flex-1 px-4 sm:px-10 pt-2'>
                        <div className='w-full max-w-lg flex-1 min-h-0 -mt-[13px]'>
                            <HaloCard className='border border-orange-500/30'>
                                <div className='px-4 py-2.5 h-full flex flex-col'>
                                    <div className='flex items-center gap-2 mb-1.5 shrink-0'>
                                        <CalendarDays size={16} className='text-orange-500' />
                                        <p className='font-bebas tracking-[2px] text-orange-500 text-base leading-none'>
                                            TODAY'S WORKOUT
                                        </p>
                                    </div>
                                    {todayExercises.length > 0 ? (
                                        <div className='flex flex-col overflow-y-auto scroll flex-1 min-h-0'>
                                            {todayExercises.map((e, i) => (
                                                <p
                                                    key={i}
                                                    className='flex items-center gap-2 font-mono text-white/80 text-sm my-auto'
                                                >
                                                    <span className='text-orange-500 leading-none'>•</span>
                                                    {e.name}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className='flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden'>
                                            <p className='font-bebas text-white tracking-[2px] text-5xl leading-none text-center'>
                                                REST DAY
                                            </p>
                                            <p className='font-mono text-white/50 text-xs text-center px-2 mt-2'>
                                                {restMessage}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </HaloCard>
                        </div>
                        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className='shrink-0' style={{ marginTop: 17 }}>
                            <button
                                onClick={handleStartClick}
                                className='flex items-center gap-3 rounded-2xl bg-[#f97316] border border-[#c2410c] px-6 py-2 cursor-pointer'
                            >
                                <Zap size={24} color="black" className='w-5 h-5' />
                                <span className='font-bebas tracking-[2px] text-black text-2xl'>Start Session</span>
                            </button>
                        </motion.div>
                    </motion.div>

                    <motion.div variants={bottomVariants} initial="hidden" animate="show" className='mt-2'>
                        <p className='font-mono text-white/40 tracking-[2px] text-[9px] text-center'>
                            DISCIPLINE • CONSISTENCY • STRENGTH
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Session panel */}
            <AnimatePresence>
                {showSession && (
                    <motion.div
                        key='session-panel'
                        className='absolute inset-x-0 bottom-0 top-16 sm:top-20 z-30 overflow-hidden'
            style={{ background: 'linear-gradient(to bottom right, #111111 45%, #9a3412 86%, #f97316 100%)' }}
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ x: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.4 } }}
                    >
                        <AnimatePresence>
                            {previewExercise && (
                                <motion.div
                                    key='preview'
                                    className='absolute inset-0 z-10 bg-[#050505] scroll overflow-y-auto'
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: 'spring', damping: 12, stiffness: 120 }}
                                >
                                    <ExerciseDetail
                                        exercise={previewExercise}
                                        onSelect={handleConfirmExercise}
                                        onBack={handleCancelPreview}
                                    />
                                </motion.div>
                            )}
                            {!previewExercise && showExercisesList && (
                                <motion.div
                                    key='exercises-list'
                                    className='absolute inset-0 z-10 bg-[#050505]'
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                >
                                    <div className='h-full scroll overflow-y-auto'>
                                        <ExercisesList
                                            onSelectExercise={handleSelectExercise}
                                            onClose={handleCloseExercises}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {!previewExercise && (
                            <div className='h-full scroll overflow-y-auto'>
                                <SessionTracker
                                    exercises={selectedExercises}
                                    onRemove={handleRemoveExercise}
                                    onAddExercises={handleAddExercises}
                                    onSessionSaved={handleSessionSaved}
                                    exerciseWeights={exerciseWeights}
                                    exerciseSets={exerciseSets}
                                    exerciseNotes={exerciseNotes}
                                    exerciseMedia={exerciseMedia}
                                    setWeight={setWeight}
                                    setReps={setReps}
                                    setNotes={setNotes}
                                    setMedia={setExerciseMedia}
                                    currentIndex={currentIndex}
                                    setCurrentIndex={setCurrentIndex}
                                    showNotes={showNotes}
                                    setShowNotes={setShowNotes}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        key='success'
                        className='absolute inset-0 z-50 flex items-center justify-center px-6 bg-black/50'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className='border border-orange-500/50 rounded-2xl bg-neutral-900 px-8 sm:px-12 py-10 flex flex-col items-center gap-6 shadow-[0_0_32px_rgba(249,115,22,0.8)]'
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.3, opacity: 0 }}
                            transition={{ type: 'spring', damping: 8, stiffness: 180 }}
                        >
                            <div className='bg-orange-500 rounded-full p-5'>
                                <Check color="black" size={48} />
                            </div>
                            <p className='text-orange-500 text-3xl sm:text-4xl font-bold text-center'>
                                {savedWorkoutName}
                            </p>
                            <p className='text-white/70 text-xl font-mono tracking-wide'>
                                Workout Saved!
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add PR bottom sheet */}
            <AnimatePresence>
                {showAddPr && (
                    <motion.div
                        key='add-pr'
                        className='fixed inset-0 z-[60] flex items-end justify-center'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className='absolute inset-0 bg-black/60' onClick={() => setShowAddPr(false)} />
                        <motion.div
                            className='relative w-full max-w-md bg-[#1a1a1a] rounded-t-3xl p-6 flex flex-col gap-4'
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        >
                            <p className='font-bebas text-orange-500 tracking-[2px] text-center text-2xl'>
                                ADD PERSONAL RECORD
                            </p>
                            <input
                                value={prName}
                                onChange={(e) => setPrName(e.target.value)}
                                placeholder='Exercise name'
                                className={modalInputClass}
                            />
                            <div className='flex gap-3'>
                                <input
                                    value={prWeight}
                                    onChange={(e) => setPrWeight(e.target.value)}
                                    placeholder='Weight (kg)'
                                    inputMode='decimal'
                                    className={modalInputClass}
                                />
                                <input
                                    value={prReps}
                                    onChange={(e) => setPrReps(e.target.value)}
                                    placeholder='Reps'
                                    inputMode='numeric'
                                    className={modalInputClass}
                                />
                            </div>
                            <button
                                onClick={handleAddPr}
                                disabled={!prName.trim() || !prWeight.trim() || !prReps.trim()}
                                className='bg-orange-500 rounded-xl py-3 font-bebas text-black tracking-[2px] text-xl cursor-pointer hover:bg-orange-400 transition-all disabled:opacity-50'
                            >
                                ADD PR
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage PR bottom sheet */}
            <AnimatePresence>
                {showManagePr && (
                    <motion.div
                        key='manage-pr'
                        className='fixed inset-0 z-[60] flex items-end justify-center'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className='absolute inset-0 bg-black/60' onClick={closeManagePr} />
                        <motion.div
                            className='relative w-full max-w-md bg-[#1a1a1a] rounded-t-3xl p-6 flex flex-col gap-4'
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        >
                            <p className='font-bebas text-orange-500 tracking-[2px] text-center text-2xl'>
                                {editingPrIndex !== null ? 'EDIT PR' : 'MANAGE PRs'}
                            </p>
                            {editingPrIndex !== null ? (
                                <>
                                    <input
                                        value={editPrName}
                                        onChange={(e) => setEditPrName(e.target.value)}
                                        placeholder='Exercise name'
                                        className={modalInputClass}
                                    />
                                    <div className='flex gap-3'>
                                        <input
                                            value={editPrWeight}
                                            onChange={(e) => setEditPrWeight(e.target.value)}
                                            placeholder='Weight (kg)'
                                            inputMode='decimal'
                                            className={modalInputClass}
                                        />
                                        <input
                                            value={editPrReps}
                                            onChange={(e) => setEditPrReps(e.target.value)}
                                            placeholder='Reps'
                                            inputMode='numeric'
                                            className={modalInputClass}
                                        />
                                    </div>
                                    <div className='flex gap-3'>
                                        <button
                                            onClick={() => setEditingPrIndex(null)}
                                            className='flex-1 border border-orange-500/40 rounded-xl py-3 font-bebas text-orange-500 tracking-[2px] cursor-pointer'
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            onClick={handleSaveEditPr}
                                            disabled={!editPrName.trim() || !editPrWeight.trim() || !editPrReps.trim()}
                                            className='flex-1 bg-orange-500 rounded-xl py-3 font-bebas text-black tracking-[2px] cursor-pointer hover:bg-orange-400 transition-all disabled:opacity-50'
                                        >
                                            SAVE
                                        </button>
                                    </div>
                                </>
                            ) : prs.length === 0 ? (
                                <p className='font-inter text-white/40 text-center'>No PRs yet. Add one!</p>
                            ) : (
                                prs.map((pr, i) => (
                                    <div
                                        key={i}
                                        className='flex items-center justify-between bg-[#111] rounded-2xl border border-orange-500/20 px-4 py-3'
                                    >
                                        <button onClick={() => handleEditPr(i)} className='text-left cursor-pointer'>
                                            <p className='font-inter text-white'>{pr.name}</p>
                                            <p className='font-mono text-gray-400'>{pr.weight} kg × {pr.reps}</p>
                                        </button>
                                        <button onClick={() => handleDeletePr(i)} className='font-inter font-bold text-red-400 cursor-pointer text-sm'>
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile photo modal */}
            {showPhotoModal && (
                <div
                    className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4'
                    onClick={() => setShowPhotoModal(false)}
                >
                    <div
                        className='bg-[#1a1a1a] border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm animate-popIn'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='flex flex-col items-center gap-3 mb-5'>
                            {photoData ? (
                                <img
                                    src={photoData}
                                    alt='Profile'
                                    className='rounded-full border-2 border-orange-500 object-cover'
                                    style={{ width: 88, height: 88 }}
                                />
                            ) : (
                                <div
                                    className='rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center'
                                    style={{ width: 88, height: 88 }}
                                >
                                    <User size={36} color='#f97316' />
                                </div>
                            )}
                            <h2 className='font-bebas text-orange-500 tracking-[2px] text-2xl'>PROFILE PHOTO</h2>
                        </div>
                        <button
                            onClick={() => photoInputRef.current?.click()}
                            className='w-full flex items-center justify-center gap-2 bg-orange-500 rounded-xl py-3 font-mono font-bold text-black cursor-pointer hover:bg-orange-400 transition-all'
                        >
                            {photoData ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        {photoData && (
                            <button
                                onClick={handlePhotoRemove}
                                className='w-full mt-3 rounded-xl py-3 font-mono font-bold text-red-400 cursor-pointer hover:bg-red-500/10 transition-all'
                            >
                                Remove Photo
                            </button>
                        )}
                        <button
                            onClick={() => setShowPhotoModal(false)}
                            className='w-full mt-3 rounded-xl py-3 font-mono font-bold text-white/50 cursor-pointer hover:text-white/80 transition-all'
                        >
                            Cancel
                        </button>
                        <input
                            ref={photoInputRef}
                            type='file'
                            accept='image/*'
                            onChange={handlePhotoUpload}
                            className='hidden'
                        />
                    </div>
                </div>
            )}

            <StaggeredMenu
                position='right'
                open={isHamburgerOpen}
                onClose={() => setIsHamburgerOpen(false)}
                items={staggeredMenuItems}
                colors={['#c2410c', '#ffffff']}
                accentColor='#f97316'
                displayItemNumbering={false}
            />
            {showGallery && <MediaGallery onClose={() => setShowGallery(false)} />}
            {showHistory && <WorkoutHistory onClose={() => setShowHistory(false)} />}
            {showSettings && (
                <Settings
                    onClose={() => setShowSettings(false)}
                    name={userName}
                    onNameChange={setUserName}
                    onScheduleSaved={refreshTodaysSchedule}
                />
            )}
        </div>
    )
}

export default HomeScreen
