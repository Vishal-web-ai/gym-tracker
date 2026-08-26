import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiMenuLine, RiCloseLine } from '@remixicon/react'
import { Check, Zap, Edit3, Plus, BicepsFlexed, User, CalendarDays, RotateCcw } from 'lucide-react'
import ExercisesList from './ExercisesList'
import SessionTracker from './SessionTracker'
import ExerciseDetail from './ExerciseDetail'
import StaggeredMenu from './StaggeredMenu'
import MediaGallery from './MediaGallery'
import WorkoutHistory from './WorkoutHistory'
import MyExercises from './MyExercises'
import Settings from './Settings'
import GreetingUser from './GreetingUser'
import Streak from './Streak'
import PrsBadge from './PrsBadge'
import RankBadge from './RankBadge'
import RankScreen from './RankScreen'
import LevelUpOverlay from './LevelUpOverlay'
import ExerciseBadgeOverlay from './ExerciseBadgeOverlay'
import { refreshProgress, applyFreezeProtection, getFreezeState, analyzeSession, mergePrs, computePrsFromSessions, challengeStatusForLevel, getChallengePicks, ensureLadders, recordSessionLadders, computeProgress, getStartRank } from '../services/progression'
import { exerciseMetaByName } from '../services/exercises'
import {
    getName,
    getSessions,
    getPrs,
    savePrs,
    getUserProfile,
    saveUserProfile,
    getSchedule,
    getCustomExercises,
    getTodaysExercises,
    computeMonthlyCount,
    hasWorkoutToday
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

const WORKOUT_DONE_MESSAGES = [
    'Good work today. See you at the next one.',
    'Session complete. See you next time.',
    'Well earned. Rest up — we go again.',
    'Nice work. Recovery starts now. See you next.',
    'Workout complete. The gains are coming.',
    'Done and dusted. Until the next session.',
    'Another one in the books. See you tomorrow.'
]

const SESSION_KEY = 'gym-tracker-session-v1'
const RESUME_FLAG = 'gym-tracker-resume-flag'

function HaloCard({ children, className = '' }) {
    return (
        <div className='relative w-full h-full'>
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
    const [showSession, setShowSession] = useState(() => {
        try {
            return !!savedSession && sessionStorage.getItem(RESUME_FLAG) === '1'
        } catch {
            return false
        }
    })
    const [showExercisesList, setShowExercisesList] = useState(false)
    const [selectedExercises, setSelectedExercises] = useState(() =>
        (savedSession?.selectedExercises || []).map(e => ({ ...e, id: e.id || crypto.randomUUID() }))
    )
    const [plannedExercises, setPlannedExercises] = useState(() =>
        (savedSession?.plannedExercises || savedSession?.selectedExercises || []).map(e => ({ ...e, id: e.id || crypto.randomUUID() }))
    )
    const [previewExercise, setPreviewExercise] = useState(null)
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
    const [showGallery, setShowGallery] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showMyExercises, setShowMyExercises] = useState(false)
    const [showRanks, setShowRanks] = useState(false)
    const [progress, setProgress] = useState(null)
    const [celebration, setCelebration] = useState(null)
    const [frozenDays, setFrozenDays] = useState([])
    const [exerciseWeights, setExerciseWeights] = useState(() => savedSession ? normalizeWeights(savedSession.exerciseWeights) : {})
    const [exerciseSets, setExerciseSets] = useState(() => savedSession?.exerciseSets || {})
    const [exerciseNotes, setExerciseNotes] = useState(() => savedSession?.exerciseNotes || {})
    const [exerciseMedia, setExerciseMedia] = useState(() => savedSession?.exerciseMedia || {})
    const [exerciseDone, setExerciseDone] = useState(() => savedSession?.exerciseDone || {})
    const [exerciseSetCount, setExerciseSetCount] = useState(() => savedSession?.exerciseSetCount || {})
    const [showSuccess, setShowSuccess] = useState(false)
    const [savedWorkoutName, setSavedWorkoutName] = useState('')
    const [challengeToasts, setChallengeToasts] = useState([])
    const challengeToastTimer = useRef(null)
    const [liveLevelUp, setLiveLevelUp] = useState(null)
    const [ladders, setLadders] = useState(null)
    const [monthlyCount, setMonthlyCount] = useState(0)
    const [statKey, setStatKey] = useState(0)
    const [prs, setPrs] = useState([])
    const [manualPrs, setManualPrs] = useState([])
    const manualPrsRef = useRef([])
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
    const [bodyweight, setBodyweight] = useState(0)
    const [sessions, setSessions] = useState([])
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [customExercises, setCustomExercises] = useState([])
    const [challengePicks, setChallengePicks] = useState({})
    const [todayExercises, setTodayExercises] = useState([])
    const [currentIndex, setCurrentIndex] = useState(() => savedSession?.currentIndex || 0)
    const [showNotes, setShowNotes] = useState(() => savedSession?.showNotes || {})
    const [todayCardScale, setTodayCardScale] = useState(1)
    const photoInputRef = useRef(null)
    const todayCardRef = useRef(null)
    const [workoutCompletedToday, setWorkoutCompletedToday] = useState(false)
    const [motivationalPhrases, setMotivationalPhrases] = useState([])

    const restMessage = REST_MESSAGES[new Date().getDay() % REST_MESSAGES.length]

    useEffect(() => {
        const el = todayCardRef.current
        if (!el) return
        const ro = new ResizeObserver(([entry]) => {
            const h = entry.contentRect.height
            setTodayCardScale(Math.min(Math.max(h / 175, 1), 1.8))
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const refreshStats = useCallback(() => {
        getSessions()
            .then(sessions => {
                setMonthlyCount(computeMonthlyCount(sessions))
            })
            .catch(() => {})
    }, [])

    const refreshSessionsAndPrs = useCallback(() => {
        getSessions()
            .then(list => {
                setSessions(list)
                setMonthlyCount(computeMonthlyCount(list))
                setPrs(mergePrs(manualPrsRef.current, computePrsFromSessions(list)))
            })
            .catch(() => {})
    }, [])

    const refreshTodaysSchedule = useCallback(() => {
        Promise.all([getSchedule(), getCustomExercises(), getChallengePicks()])
            .then(([schedule, custom, picks]) => {
                setCustomExercises(custom)
                setChallengePicks(picks || {})
                setTodayExercises(getTodaysExercises(schedule))
            })
            .catch(() => {})
    }, [])

    const handleDeletedSession = useCallback(() => {
        refreshSessionsAndPrs()
        refreshProgress()
            .then(result => {
                if (!result) return
                setProgress(result.progress)
                if (result.ladders) setLadders(result.ladders)
            })
            .catch(() => {})
        hasWorkoutToday()
            .then(completed => {
                setWorkoutCompletedToday(completed)
                if (!completed) setMotivationalPhrases([])
            })
            .catch(() => {})
        setStatKey(k => k + 1)
    }, [refreshSessionsAndPrs])

    useEffect(() => {
        getName().then(setUserName).catch(() => {})
        getPrs()
            .then(list => {
                const manual = Array.isArray(list) ? list : []
                manualPrsRef.current = manual
                setManualPrs(manual)
                getSessions()
                    .then(sess => {
                        setSessions(sess)
                        setMonthlyCount(computeMonthlyCount(sess))
                        setPrs(mergePrs(manual, computePrsFromSessions(sess)))
                    })
                    .catch(() => {})
            })
            .catch(() => {})
        getUserProfile()
            .then(profile => {
                setPhotoData(profile.photoData || '')
                setBodyweight(parseFloat(profile.weight) || 0)
            })
            .catch(() => {})
        refreshTodaysSchedule()
        refreshStats()
        Promise.all([getSessions(), getUserProfile().catch(() => ({}))])
            .then(([sess, profile]) => ensureLadders(sess, parseFloat(profile?.weight) || 0))
            .then(setLadders)
            .catch(() => {})
    }, [refreshSessionsAndPrs, refreshStats, refreshTodaysSchedule])

    useEffect(() => {
        let cancelled = false
        applyFreezeProtection()
            .then(() => Promise.all([getFreezeState(), refreshProgress()]))
            .then(([freezeState, result]) => {
                if (cancelled) return
                setFrozenDays(freezeState.frozenDays || [])
                setProgress(result.progress)
                if (result.ladders) setLadders(result.ladders)
            })
            .catch((err) => {
                console.error('Initial progress load failed:', err)
                // Fallback: compute progress from sessions directly
                if (cancelled) return
                Promise.all([getSessions(), getUserProfile().catch(() => ({})), getCustomExercises(), getChallengePicks(), getFreezeState()])
                    .then(([sessions, profile, customEx, picks, freezeState]) => {
                        if (cancelled) return
                        const bw = parseFloat(profile?.weight) || 0
                        ensureLadders(sessions, bw).then((laddersData) => {
                            if (cancelled) return
                            getStartRank().then((startRank) => {
                                if (cancelled) return
                                const progress = computeProgress({
                                    sessions,
                                    frozenDays: freezeState.frozenDays,
                                    now: new Date(),
                                    startRank,
                                    bodyweight: bw,
                                    picks,
                                    customExercises: customEx,
                                    ladders: laddersData
                                })
                                setProgress(progress)
                                setLadders(laddersData)
                            }).catch(() => {})
                        }).catch(() => {})
                    })
                    .catch(() => {})
            })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        hasWorkoutToday()
            .then(completed => {
                setWorkoutCompletedToday(completed)
                if (completed) {
                    const msg = WORKOUT_DONE_MESSAGES[Math.floor(Math.random() * WORKOUT_DONE_MESSAGES.length)]
                    setMotivationalPhrases([msg])
                }
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!workoutCompletedToday) return
        const now = new Date()
        const midnight = new Date(now)
        midnight.setHours(24, 0, 0, 0)
        const timer = setTimeout(() => {
            setWorkoutCompletedToday(false)
            setMotivationalPhrases([])
            hasWorkoutToday()
                .then(completed => setWorkoutCompletedToday(completed))
                .catch(() => {})
        }, midnight - now)
        return () => clearTimeout(timer)
    }, [workoutCompletedToday])

    useEffect(() => {
        if (!showSession) return
        try {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                selectedExercises,
                plannedExercises,
                exerciseWeights,
                exerciseSets,
                exerciseNotes,
                exerciseMedia,
                exerciseDone,
                exerciseSetCount,
                currentIndex,
                showNotes
            }))
        } catch {
            // snapshot too large to persist; skip silently
        }
    }, [showSession, selectedExercises, plannedExercises, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, exerciseDone, exerciseSetCount, currentIndex, showNotes])

    useEffect(() => {
        try {
            if (showSession) sessionStorage.setItem(RESUME_FLAG, '1')
            else sessionStorage.removeItem(RESUME_FLAG)
        } catch {
            // ignore
        }
    }, [showSession])

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

    const setDone = (exerciseIdx, setIdx, value) => {
        setExerciseDone(prev => {
            const arr = Array.isArray(prev[exerciseIdx]) ? prev[exerciseIdx] : []
            const next = [...arr]
            next[setIdx] = value
            return { ...prev, [exerciseIdx]: next }
        })
    }

    const setSetCount = (exerciseIdx, count) => {
        setExerciseSetCount(prev => ({ ...prev, [exerciseIdx]: count }))
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
        const newExercise = {
            id: crypto.randomUUID(),
            name: exercise.name,
            mode: exercise.mode,
            category: exercise.category || exerciseMetaByName(exercise.name)?.category
        }
        setSelectedExercises(prev => {
            const next = [...prev, newExercise]
            if (exercise.mode === 'bodyweight' && bodyweight > 0) {
                const idx = next.length - 1
                setExerciseWeights(prev => ({
                    ...prev,
                    [idx]: { 0: String(bodyweight), 1: String(bodyweight), 2: String(bodyweight) }
                }))
            }
            return next
        })
        setPlannedExercises(prev => [...prev, newExercise])
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
        setExerciseDone(prev => reindexMap(prev, idx))
        setExerciseSetCount(prev => reindexMap(prev, idx))
        setShowNotes(prev => reindexMap(prev, idx))
        setCurrentIndex(prev => Math.max(prev - 1, 0))
        removedMedia.forEach(m => deleteMedia(m.id).catch(() => {}))
    }

    const handleGoHome = () => {
        setShowSession(false)
        setShowExercisesList(false)
        setPreviewExercise(null)
        setIsHamburgerOpen(false)
    }

    const handleResumeSession = () => {
        setShowSession(true)
        setShowExercisesList(false)
        setPreviewExercise(null)
        setIsHamburgerOpen(false)
    }

    const handleStartClick = () => {
        if (todayExercises.length > 0) {
            const list = todayExercises.map(e => ({
                id: crypto.randomUUID(),
                name: e.name,
                mode: e.mode,
                category: e.category || exerciseMetaByName(e.name)?.category
            }))
            setPlannedExercises(list)
            setSelectedExercises(list)
            const weights = {}
            if (bodyweight > 0) {
                list.forEach((ex, idx) => {
                    if (ex.mode === 'bodyweight') {
                        weights[idx] = { 0: String(bodyweight), 1: String(bodyweight), 2: String(bodyweight) }
                    }
                })
            }
            setExerciseWeights(weights)
            setExerciseSets({})
            setExerciseNotes({})
            setExerciseMedia({})
            setExerciseDone({})
            setExerciseSetCount({})
        }
        setCurrentIndex(0)
        setShowNotes({})
        setShowSession(true)
        setShowExercisesList(false)
    }

    const handleJumpToExercise = (id) => {
        const idx = selectedExercises.findIndex(e => e.id === id)
        if (idx >= 0) {
            setCurrentIndex(idx)
            return
        }
        const planned = plannedExercises.find(e => e.id === id)
        if (planned) {
            setSelectedExercises(prev => [...prev, planned])
            setCurrentIndex(selectedExercises.length)
        }
    }

    const handleAddExercises = () => {
        setShowExercisesList(true)
    }

    const handleCloseExercises = () => {
        setShowExercisesList(false)
    }

    const handleSessionSaved = useCallback(async (name, session) => {
        try {
            localStorage.removeItem(SESSION_KEY)
        } catch {
            // ignore
        }

        let result = null
        let breakdown = null

        try {
            if (session) {
                const res = await recordSessionLadders(session, bodyweight).catch((err) => {
                    console.error('recordSessionLadders failed:', err)
                    return null
                })
                if (res) {
                    setLadders(res.ladders)
                }
            }

            result = await refreshProgress().catch((err) => {
                console.error('refreshProgress failed:', err)
                return null
            })
            if (result) {
                setProgress(result.progress)
                if (result.ladders) setLadders(result.ladders)
            } else {
                // Fallback: recompute progress inline if refreshProgress failed
                try {
                    const sessions = await getSessions()
                    const profile = await getUserProfile().catch(() => ({}))
                    const bw = parseFloat(profile?.weight) || 0
                    const laddersData = await ensureLadders(sessions, bw)
                    const customExercises = await getCustomExercises()
                    const picks = await getChallengePicks()
                    const freezeState = await getFreezeState()
                    const startRank = await getStartRank()
                    const fallbackProgress = computeProgress({
                        sessions,
                        frozenDays: freezeState.frozenDays,
                        now: new Date(),
                        startRank,
                        bodyweight: bw,
                        picks,
                        customExercises,
                        ladders: laddersData
                    })
                    setProgress(fallbackProgress)
                    setLadders(laddersData)
                } catch (fallbackErr) {
                    console.error('Fallback progress computation failed:', fallbackErr)
                }
            }

            if (session) {
                const sessions = await getSessions().catch(() => [])
                const prior = sessions.filter(s => s.id !== session.id && (s.createdAt || '') <= (session.createdAt || ''))
                breakdown = analyzeSession(session, prior)
                if (result && !result.isLevelUp) {
                    const level = result.progress.rank.level
                    const before = challengeStatusForLevel(prior, level, challengePicks, customExercises)
                    const after = result.progress.challenges?.[level - 1]?.groups || []
                    const newDone = after.filter(g => g.done && !before.some(b => b.key === g.key && b.done))
                    if (newDone.length) {
                        if (challengeToastTimer.current) clearTimeout(challengeToastTimer.current)
                        setChallengeToasts(newDone.map(g => g.label))
                        challengeToastTimer.current = setTimeout(() => setChallengeToasts([]), 4000)
                    }
                }
            }
        } catch (err) {
            console.error('Session saved callback error:', err)
        }

        setSelectedExercises([])
        setPlannedExercises([])
        setExerciseWeights({})
        setExerciseSets({})
        setExerciseNotes({})
        setExerciseMedia({})
        setExerciseDone({})
        setExerciseSetCount({})
        setCurrentIndex(0)
        setShowNotes({})
        setSavedWorkoutName(name)
        setShowSession(false)
        setShowSuccess(true)
        refreshStats()
        refreshSessionsAndPrs()
        setStatKey(k => k + 1)

        setWorkoutCompletedToday(true)
        const msg = WORKOUT_DONE_MESSAGES[Math.floor(Math.random() * WORKOUT_DONE_MESSAGES.length)]
        setMotivationalPhrases([msg])

        if (result && result.isLevelUp) {
            setShowSuccess(false)
            setCelebration({
                rank: result.progress.rank,
                breakdown,
                isLevelUp: result.isLevelUp,
                progress: result.progress
            })
        } else if (result) {
            setShowSuccess(false)
            setCelebration({
                rank: result.progress.rank,
                breakdown,
                isLevelUp: false,
                progress: result.progress
            })
        } else {
            setTimeout(() => {
                setShowSuccess(false)
                setSavedWorkoutName('')
            }, 1800)
        }
    }, [refreshStats, refreshSessionsAndPrs, customExercises, challengePicks, bodyweight])

    const persistPrs = (next) => {
        const manual = [...next]
        manualPrsRef.current = manual
        setManualPrs(manual)
        setPrs(mergePrs(manual, computePrsFromSessions(sessions)))
        savePrs(manual).catch(() => {})
    }

    const handleAddPr = () => {
        if (!prName.trim() || !prWeight.trim() || !prReps.trim()) return
        persistPrs([...manualPrs, { name: prName.trim(), weight: prWeight.trim(), reps: prReps.trim() }])
        setPrName('')
        setPrWeight('')
        setPrReps('')
        setShowAddPr(false)
    }

    const handleEditPr = (idx) => {
        const pr = manualPrs[idx]
        setEditingPrIndex(idx)
        setEditPrName(pr.name)
        setEditPrWeight(pr.weight)
        setEditPrReps(pr.reps)
    }

    const handleSaveEditPr = () => {
        if (editingPrIndex === null || !editPrName.trim() || !editPrWeight.trim() || !editPrReps.trim()) return
        persistPrs(manualPrs.map((pr, i) =>
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
        persistPrs(manualPrs.filter((_, i) => i !== idx))
    }

    const closeManagePr = () => {
        setEditingPrIndex(null)
        setShowManagePr(false)
    }

    const staggeredMenuItems = [
        { label: 'My Ranks', ariaLabel: 'Open my ranks', onClick: () => { setIsHamburgerOpen(false); setShowRanks(true) } },
        { label: 'Workout History', ariaLabel: 'Open workout history', onClick: () => { setIsHamburgerOpen(false); setShowHistory(true) } },
        { label: 'Gym Memories', ariaLabel: 'Open gym memories gallery', onClick: () => { setIsHamburgerOpen(false); setShowGallery(true) } },
        { label: 'My Exercises', ariaLabel: 'Open my exercises', onClick: () => { setIsHamburgerOpen(false); setShowMyExercises(true) } },
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
                            className='rounded-full border border-orange-500 object-cover w-9 h-9 sm:w-10 sm:h-10'
                        />
                    ) : (
                        <div className='w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed border-orange-500/60 bg-[rgba(10,10,10,0.85)] flex items-center justify-center'>
                            <User size={16} className='text-orange-500' />
                        </div>
                    )}
                </div>
                <div className='flex items-center gap-2 rounded-full px-4 py-1.5 cursor-pointer' onClick={handleGoHome} title='Go to Home'>
                    <img src='/logo.png' alt='Gym Tracker' className='h-12 sm:h-16 w-auto object-contain' />
                </div>
                <div
                    data-menu-toggle
                    aria-expanded={isHamburgerOpen}
                    aria-controls='staggered-menu-panel'
                    className='absolute right-4 sm:right-5 cursor-pointer z-40'
                    onClick={() => setIsHamburgerOpen(v => !v)}
                >
                    {isHamburgerOpen ? (
                        <RiCloseLine color="white" size={28} className='sm:size-10' />
                    ) : (
                        <RiMenuLine color="white" size={28} className='sm:size-10' />
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
                                    {progress?.rank && (
                                        <div className='mb-1.5 cursor-pointer' onClick={() => setShowRanks(true)}>
                                            <RankBadge rank={progress.rank} compact />
                                        </div>
                                    )}
                                    <Streak refreshKey={statKey} frozenDays={frozenDays} />
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

                            <div className='flex-[0.6] border border-orange-500/30 rounded-2xl bg-[rgba(10,10,10,0.85)] px-4 py-2.5 flex flex-col justify-start'>
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

                    <motion.div variants={bottomVariants} initial="hidden" animate="show" className='flex flex-col items-center w-full flex-1 min-h-0 px-4 sm:px-10 pt-2'>
                        <div ref={todayCardRef} className='w-full max-w-lg flex-1 min-h-0 -mt-[11px]'>
                            <HaloCard className='border border-orange-500/30'>
                                <div className='px-4 py-2.5 h-full flex flex-col'>
                                    <div className='flex items-center gap-2 mb-1.5 shrink-0'>
                                        <CalendarDays size={16} className='text-orange-500' />
                                        <p className='font-bebas tracking-[2px] text-orange-500 leading-none' style={{ fontSize: `${16 * todayCardScale}px` }}>
                                            TODAY'S WORKOUT
                                        </p>
                                    </div>
                                    {todayExercises.length > 0 ? (
                                        <div className='flex flex-col overflow-y-auto scroll flex-1 min-h-0'>
                                            {workoutCompletedToday && motivationalPhrases.length > 0 ? (
                                                motivationalPhrases.map((phrase, i) => {
                                                    const words = phrase.split(' ')
                                                    const mid = Math.ceil(words.length / 2)
                                                    const firstHalf = words.slice(0, mid).join(' ')
                                                    const secondHalf = words.slice(mid).join(' ')
                                                    return (
                                                        <div key={i} className='flex flex-col items-center my-auto shrink-0'>
                                                            <p
                                                                className='font-bold text-white leading-tight text-center'
                                                                style={{ fontSize: `${20 * todayCardScale}px` }}
                                                            >
                                                                {firstHalf}
                                                            </p>
                                                            <p
                                                                className='font-bold text-orange-400 leading-tight text-center'
                                                                style={{ fontSize: `${20 * todayCardScale}px` }}
                                                            >
                                                                {secondHalf}
                                                            </p>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                todayExercises.map((e, i) => (
                                                    <p
                                                        key={i}
                                                        className='flex items-center gap-2 font-mono text-white/80 my-auto shrink-0'
                                                        style={{ fontSize: `${14 * todayCardScale}px` }}
                                                    >
                                                        <span className='text-orange-500 leading-none'>•</span>
                                                        {e.name}
                                                    </p>
                                                ))
                                            )}
                                        </div>
                                    ) : (
                                        <div className='flex-1 min-h-0 flex flex-col items-center justify-center overflow-y-auto scroll'>
                                            <p className='font-bebas text-white tracking-[2px] leading-none text-center' style={{ fontSize: `${48 * todayCardScale}px` }}>
                                                REST DAY
                                            </p>
                                            <p className='font-mono text-white/50 text-center px-2 mt-2' style={{ fontSize: `${12 * todayCardScale}px` }}>
                                                {restMessage}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </HaloCard>
                        </div>
                        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className='shrink-0' style={{ marginTop: 17 }}>
                            <button
                                onClick={selectedExercises.length > 0 ? handleResumeSession : handleStartClick}
                                className='flex items-center gap-3 rounded-2xl bg-[#f97316] border border-[#c2410c] px-6 py-2 cursor-pointer'
                            >
                                {selectedExercises.length > 0 ? (
                                    <RotateCcw size={20} color="black" className='w-5 h-5' />
                                ) : (
                                    <Zap size={24} color="black" className='w-5 h-5' />
                                )}
                                <span className='font-bebas tracking-[2px] text-black text-2xl'>
                                    {selectedExercises.length > 0 ? 'Resume Session' : 'Start Session'}
                                </span>
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
            style={{ background: '#050505' }}
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ x: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.4 } }}
                    >
                        <AnimatePresence>
                            {previewExercise && (
                                <motion.div
                                    key='preview'
                                    className='absolute inset-0 z-[40] bg-[#050505] scroll overflow-y-auto'
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
                                    className='absolute inset-0 z-[40] bg-[#050505]'
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
                                    plannedExercises={plannedExercises}
                                    onRemove={handleRemoveExercise}
                                    onAddExercises={handleAddExercises}
                                    onSessionSaved={handleSessionSaved}
                                    onJumpToExercise={handleJumpToExercise}
                                    exerciseWeights={exerciseWeights}
                                    exerciseSets={exerciseSets}
                                    exerciseNotes={exerciseNotes}
                                    exerciseMedia={exerciseMedia}
                                    exerciseDone={exerciseDone}
                                    exerciseSetCount={exerciseSetCount}
                                    setWeight={setWeight}
                                    setReps={setReps}
                                    setNotes={setNotes}
                                    setMedia={setExerciseMedia}
                                    setDone={setDone}
                                    setSetCount={setSetCount}
                                    currentIndex={currentIndex}
                                    setCurrentIndex={setCurrentIndex}
                                    showNotes={showNotes}
                                    setShowNotes={setShowNotes}
                                    bodyweight={bodyweight}
                                    ladders={ladders}
                                    sessions={sessions}
                                    onLiveLevelUp={setLiveLevelUp}
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

            {/* Challenge complete toasts */}
            <AnimatePresence>
                {challengeToasts.length > 0 && (
                    <motion.div
                        key='challenge-toasts'
                        className='fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none'
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.25 }}
                    >
                        {challengeToasts.map(label => (
                            <div key={label} className='flex items-center gap-2 bg-emerald-500 text-black rounded-full px-4 py-2 font-mono text-sm font-bold shadow-[0_0_24px_rgba(16,185,129,0.6)]'>
                                <svg width='14' height='14' viewBox='0 0 24 24' fill='none'>
                                    <path d='M5 13l4 4L19 7' stroke='black' strokeWidth='3.5' strokeLinecap='round' strokeLinejoin='round' />
                                </svg>
                                {label} challenge complete!
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Live exercise level-up overlay (during session) */}
            {liveLevelUp && (
                <ExerciseBadgeOverlay
                    exerciseName={liveLevelUp.exerciseName}
                    level={liveLevelUp.level}
                    color={liveLevelUp.color}
                    onClose={() => setLiveLevelUp(null)}
                />
            )}

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
            {showHistory && <WorkoutHistory onClose={() => setShowHistory(false)} onDeleted={handleDeletedSession} />}
            {showMyExercises && <MyExercises onClose={() => setShowMyExercises(false)} />}
            {showRanks && <RankScreen onClose={() => setShowRanks(false)} />}
            {celebration && (
                <LevelUpOverlay
                    rank={celebration.rank}
                    breakdown={celebration.breakdown}
                    isLevelUp={celebration.isLevelUp}
                    progress={celebration.progress}
                    onClose={() => setCelebration(null)}
                />
            )}
            {showSettings && (
                <Settings
                    onClose={() => setShowSettings(false)}
                    name={userName}
                    onNameChange={setUserName}
                    onScheduleSaved={refreshTodaysSchedule}
                    onChallengesSaved={() => { refreshTodaysSchedule(); refreshProgress() }}
                />
            )}
        </div>
    )
}

export default HomeScreen
