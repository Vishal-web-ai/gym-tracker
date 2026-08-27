import { useState, useLayoutEffect, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, Video, StickyNote, Trash2, X, Plus, Minus, Save, Check, Images, Film, Flame, Zap, Timer } from 'lucide-react'
import NumberOfSets from './NumberOfSets'
import ExerciseMedia from './ExerciseMedia'
import RestTimer from './RestTimer'
import { createSession, getRestSound, getSessions } from '../services/storage'
import { addMedia } from '../services/media'
import { getErrorMessage } from '../services/errors'
import { buildHistoryIndex, parseDurationSeconds, formatDuration, ladderView, projectExerciseLadder } from '../services/progression'

const XP_BURST = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    return {
        id: i,
        x: Math.cos(angle) * 70,
        y: Math.sin(angle) * 70,
        delay: (i % 4) * 0.05,
        color: ['#f97316', '#fbbf24', '#fb923c', '#fff'][i % 4],
        size: 5 + (i % 3) * 2
    }
})

const WeightCell = ({ value, onChange, disabled = false, suffix = '', bodyweight = 0 }) => {
    const inputRef = useRef(null)
    const showSuffix = suffix && bodyweight > 0 && (value === '' || String(bodyweight) === String(value))

    const handleChange = (e) => {
        const v = e.target.value
        if (v === '' || /^\d*\.?\d*$/.test(v)) {
            onChange(v)
        }
    }

    return (
        <div className='relative'>
            <input
                ref={inputRef}
                type='text'
                inputMode='decimal'
                value={value}
                disabled={disabled}
                onChange={handleChange}
                placeholder={showSuffix ? '' : '0'}
                className={`w-full h-9 bg-black/30 border border-white/15 rounded-xl text-center font-bebas text-orange-400 text-lg outline-none placeholder-orange-400/40 disabled:cursor-not-allowed disabled:opacity-40 ${showSuffix ? 'pr-16' : ''}`}
            />
            {showSuffix && (
                <span className='absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold text-white/60 pointer-events-none'>
                    {suffix}
                </span>
            )}
        </div>
    )
}

const ExerciseCard = ({ exercise, idx, enterDir, onRemove, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, exerciseDone, exerciseSetCount, setWeight, setReps, setNotes, setMedia, setDone, setSetCount, showNotes, setShowNotes, sound, bodyweight, sessions = [], ladders = null, onXpFlash, canPrev, canNext, onGoPrev, onGoNext, onLevelUp }) => {
    const photoCaptureRef = useRef(null)
    const photoGalleryRef = useRef(null)
    const videoCaptureRef = useRef(null)
    const videoGalleryRef = useRef(null)
    const cardRef = useRef(null)
    const glowRef = useRef(null)
    const [busy, setBusy] = useState(false)
    const [menuFor, setMenuFor] = useState(null)
    const rewardedRef = useRef(new Set())
    const nameRef = useRef(null)
    const setsScrollRef = useRef(null)
    const dragRef = useRef(null)
    const rafRef = useRef(null)
    const snapTimerRef = useRef(null)
    const settleTimerRef = useRef(null)
    const isTimer = exercise.mode === 'timer'
    const isBodyweight = exercise.mode === 'bodyweight'
    const setCount = Math.max(3, Math.min(10, exerciseSetCount?.[idx] || 3))
    const prevSetCount = useRef(setCount)
    const width = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 375))[0]
    const gutter = 12
    const CW = Math.max(200, width - gutter * 2)
    const shift = CW - 40
    const enterOffset = Math.max(90, Math.round(shift * 0.42))

    const setCardTransform = (px, ms = 0) => {
        const el = cardRef.current
        if (!el) return
        const prog = Math.min(1, Math.abs(px) / shift)
        const rot = prog * 7 * Math.sign(px)
        el.style.transition = ms > 0 ? `transform ${ms}ms cubic-bezier(0.16, 1, 0.3, 1)` : 'none'
        el.style.transform = `translateX(${px}px) rotate(${rot}deg) scale(${1 - 0.04 * prog})`
        el.style.willChange = 'transform'
        if (glowRef.current) glowRef.current.style.opacity = 0.55 * prog
        clearTimeout(settleTimerRef.current)
        if (px !== 0) {
            // backdrop-blur is very expensive on weak devices while a layer is
            // moving (it re-samples the backdrop every frame). Drop it during
            // motion and restore once the card settles.
            el.style.backdropFilter = 'none'
        } else if (ms > 0) {
            settleTimerRef.current = setTimeout(() => {
                el.style.willChange = ''
                el.style.backdropFilter = ''
            }, ms + 50)
        } else {
            el.style.willChange = ''
            el.style.backdropFilter = ''
        }
    }

    const buzz = (pattern = 10) => {
        try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
    }

    const snapBack = () => setCardTransform(0, 220)

    // Flings the card fully off-screen in the given direction, then advances.
    const flyOut = (dir) => {
        const el = cardRef.current
        if (!el) return
        const exit = (width + CW) / 2 + 30
        clearTimeout(settleTimerRef.current)
        el.style.transition = 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = `translateX(${exit * dir}px) rotate(${22 * dir}deg) scale(0.95)`
        el.style.willChange = 'transform'
        el.style.backdropFilter = 'none'
        snapTimerRef.current = setTimeout(dir < 0 ? onGoNext : onGoPrev, 310)
    }

    const handlePointerDown = (e) => {
        if (e.target.closest('button, input, textarea')) return
        const el = cardRef.current
        if (!el) return
        clearTimeout(snapTimerRef.current)
        clearTimeout(settleTimerRef.current)
        dragRef.current = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, lastT: performance.now(), vx: 0 }
        try { el.setPointerCapture(e.pointerId) } catch { /* pointer capture is optional */ }
        el.style.transition = 'none'
        el.style.backdropFilter = 'none'
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
        if ((dx < -40 || d.vx < -350) && canNext) {
            buzz(12)
            flyOut(-1)
        } else if ((dx > 40 || d.vx > 350) && canPrev) {
            buzz(12)
            flyOut(1)
        } else {
            if (Math.abs(dx) > 8) buzz(6)
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
        const from = enterDir === 'prev' ? -enterOffset : enterOffset
        el.style.transition = 'none'
        el.style.transform = `translateX(${from}px)`
        el.style.willChange = 'transform'
        el.style.backdropFilter = 'none'
        const raf = requestAnimationFrame(() => {
            el.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)'
            el.style.transform = 'translateX(0px)'
        })
        const settle = setTimeout(() => {
            el.style.willChange = ''
            el.style.backdropFilter = ''
        }, 340)
        return () => { cancelAnimationFrame(raf); clearTimeout(settle) }
    }, [enterOffset, enterDir])

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

    const savedEntry = useMemo(() => {
        const liveSets = []
        for (let si = 0; si < setCount; si++) {
            if (!exerciseDone[idx]?.[si]) continue
            liveSets.push({
                reps: exerciseSets[idx]?.[si] || '—',
                weight: isTimer ? '—' : (exerciseWeights[idx]?.[si] ? `${exerciseWeights[idx][si]}kg` : '—')
            })
        }
        const synthetic = liveSets.length > 0
            ? [{ exercises: [{ name: exercise.name, mode: exercise.mode, sets: liveSets }] }]
            : []
        return buildHistoryIndex([...(sessions || []), ...synthetic])[exercise.name]
    }, [sessions, exercise.name, exercise.mode, exerciseDone, exerciseSets, exerciseWeights, idx, setCount, isTimer])
    const ladder = ladders?.[exercise.name] ? ladderView(ladders[exercise.name], bodyweight) : null
    let livePerf = 0
    for (let si = 0; si < setCount; si++) {
        if (!exerciseDone[idx]?.[si]) continue
        if (isTimer) {
            livePerf = Math.max(livePerf, parseDurationSeconds(exerciseSets[idx]?.[si]))
        } else {
            const reps = parseFloat(exerciseSets[idx]?.[si]) || 0
            const w = parseFloat(String(exerciseWeights[idx]?.[si]).replace('kg', '')) || 0
            if (reps >= 8 && w > livePerf) livePerf = w
        }
    }
    const challengeHit = !!ladder && livePerf > 0 && livePerf >= ladder.nextTarget
    const laddersReady = ladders != null

    // Live level projection from completed sets
    const completedSets = useMemo(() => {
        const sets = []
        for (let si = 0; si < setCount; si++) {
            if (!exerciseDone[idx]?.[si]) continue
            sets.push({
                reps: exerciseSets[idx]?.[si] || '—',
                weight: isTimer ? '—' : (exerciseWeights[idx]?.[si] ? `${exerciseWeights[idx][si]}kg` : '—')
            })
        }
        return sets
    }, [exerciseDone, exerciseSets, exerciseWeights, idx, setCount, isTimer])

    const projected = useMemo(() => {
        if (completedSets.length === 0) return null
        return projectExerciseLadder(
            ladders?.[exercise.name] || null,
            completedSets,
            exercise.mode,
            exercise.category || 'Chest',
            bodyweight,
            exercise.name
        )
    }, [completedSets, ladders, exercise.name, exercise.mode, exercise.category, bodyweight])

    const prevLevelRef = useRef(projected?.projectedLevel ?? 0)
    const levelUpTimerRef = useRef(null)
    useEffect(() => {
        if (!projected || !projected.didLevelUp) return
        if (projected.projectedLevel > prevLevelRef.current) {
            clearTimeout(levelUpTimerRef.current)
            levelUpTimerRef.current = setTimeout(() => {
                onLevelUp?.({
                    exerciseName: exercise.name,
                    level: projected.projectedLevel,
                    color: projected.badge?.color || '#f97316'
                })
            }, 1000)
        }
        prevLevelRef.current = projected.projectedLevel
        return () => clearTimeout(levelUpTimerRef.current)
    }, [projected, exercise.name, onLevelUp])

    // Use projected level for display if available, otherwise fall back to persisted
    const displayLevel = projected?.projectedLevel ?? ladder?.tier ?? 0
    const displayLevelName = projected?.badge?.name || ladder?.levelName || 'Unranked'
    const displayColor = projected?.badge?.color || ladder?.color || '#737373'

    const fmtLoad = (v) => (v == null || !(v > 0) ? '—' : isTimer ? formatDuration(v) : `${v}kg`)
    const pr = savedEntry && savedEntry.bestWeight > 0
        ? { name: exercise.name, weight: savedEntry.bestWeight, reps: savedEntry.bestRepsAtWeight?.[savedEntry.bestWeight] || '—' }
        : null

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

    const checkBonus = (setIdx) => {
        const doneSets = []
        for (let si = 0; si < setCount; si++) {
            if (si !== setIdx && exerciseDone[idx]?.[si]) {
                doneSets.push({
                    reps: exerciseSets[idx]?.[si] || '—',
                    weight: isTimer ? '—' : (exerciseWeights[idx]?.[si] ? `${exerciseWeights[idx][si]}kg` : '—')
                })
            }
        }
        const reps = isTimer
            ? parseDurationSeconds(exerciseSets[idx]?.[setIdx])
            : parseFloat(exerciseSets[idx]?.[setIdx]) || 0
        const weight = parseFloat(String(exerciseWeights[idx]?.[setIdx]).replace('kg', '')) || 0
        const isTimerMode = isTimer
        const exerciseName = exercise.name
        const exerciseMode = exercise.mode

        getSessions().then(allSessions => {
            const synthetic = doneSets.length > 0 ? [{ exercises: [{ name: exerciseName, mode: exerciseMode, sets: doneSets }] }] : []
            const index = buildHistoryIndex([...(allSessions || []), ...synthetic])
            const entry = index[exerciseName]
            let bonus = null
            if (isTimerMode) {
                if (entry && reps > entry.bestDuration) bonus = { type: 'timer-record', points: 10 }
            } else if (entry && entry.bestWeight > -Infinity && weight > entry.bestWeight) {
                bonus = { type: 'weight-pr', points: 10 }
            } else if (entry && weight > 0 && weight in (entry.bestRepsAtWeight || {}) && reps > entry.bestRepsAtWeight[weight]) {
                bonus = { type: 'extra-rep', points: 5 }
            }
            if (bonus && !rewardedRef.current.has(`${idx}:${setIdx}`)) {
                rewardedRef.current.add(`${idx}:${setIdx}`)
                onXpFlash({ id: Date.now(), type: bonus.type, points: bonus.points })
            }
        }).catch(() => {})
    }

    const handleToggleDone = (setIdx) => {
        const currentlyDone = !!exerciseDone[idx]?.[setIdx]
        if (!currentlyDone) {
            checkBonus(setIdx)
        }
        setDone(idx, setIdx, !currentlyDone)
    }

    const handleRepsChange = (setIdx, val) => {
        setReps(idx, setIdx, val)
        if (exerciseDone[idx]?.[setIdx]) {
            checkBonus(setIdx)
        }
    }

    const handleWeightChange = (setIdx, val) => {
        setWeight(idx, setIdx, val)
        if (exerciseDone[idx]?.[setIdx]) {
            checkBonus(setIdx)
        }
    }

    return (
        <div
            ref={cardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className='absolute top-0 bottom-10 left-3 right-3 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-2xl overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing shadow-[0_20px_45px_rgba(0,0,0,0.6)]'
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
                className='absolute inset-0 pointer-events-none rounded-3xl'
                style={{
                    backgroundImage: [
                        'linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.07) 42%, transparent 56%)',
                        'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 40%)',
                        'radial-gradient(110% 85% at 90% 100%, rgba(255,255,255,0.06) 0%, transparent 62%)',
                        'radial-gradient(80% 55% at 0% 0%, rgba(255,255,255,0.04) 0%, transparent 55%)'
                    ].join(', '),
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 50px rgba(255,255,255,0.05)'
                }}
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
                    {isBodyweight && (
                        <span className='absolute left-0 top-0 text-[10px] font-mono font-bold tracking-[1px] text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 leading-tight text-center'>
                            Bodyweight<br/>Exercise
                        </span>
                    )}
                    <button
                        onClick={() => onRemove(idx)}
                        className='relative z-10 ml-auto flex w-9 h-9 rounded-lg border border-white/20 bg-white/5 items-center justify-center cursor-pointer hover:bg-white/15 transition-all shrink-0'
                        title='Remove exercise'
                    >
                        <Trash2 size={15} className='text-white/70' />
                    </button>
                </div>

                {/* Action buttons + media pill — centered below the name */}
                <div className='relative flex flex-wrap items-center justify-center gap-2 mt-1.5'>
                    <button
                        onClick={() => setMenuFor('photo')}
                        disabled={busy}
                        className='w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center cursor-pointer hover:border-orange-400/60 hover:text-orange-300 transition-all disabled:opacity-50'
                        title='Add photo'
                    >
                        <Camera size={16} className='text-white/70' />
                    </button>
                    <button
                        onClick={() => setMenuFor('video')}
                        disabled={busy}
                        className='w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center cursor-pointer hover:border-orange-400/60 hover:text-orange-300 transition-all disabled:opacity-50'
                        title='Add video'
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
                    {menuFor && (
                        <>
                            <div
                                className='fixed inset-0 z-30'
                                onPointerDown={(e) => { e.stopPropagation(); setMenuFor(null) }}
                            />
                            <div className='absolute top-full right-0 z-40 mt-2 w-44 rounded-xl border border-white/15 bg-neutral-800/95 backdrop-blur-xl p-1.5 shadow-2xl animate-popIn'>
                                <button
                                    onClick={() => {
                                        setMenuFor(null)
                                        if (menuFor === 'photo') photoCaptureRef.current?.click()
                                        else videoCaptureRef.current?.click()
                                    }}
                                    className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer'
                                >
                                    {menuFor === 'photo'
                                        ? <Camera size={14} className='text-orange-400' />
                                        : <Video size={14} className='text-orange-400' />}
                                    {menuFor === 'photo' ? 'Take Photo' : 'Record Video'}
                                </button>
                                <button
                                    onClick={() => {
                                        setMenuFor(null)
                                        if (menuFor === 'photo') photoGalleryRef.current?.click()
                                        else videoGalleryRef.current?.click()
                                    }}
                                    className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer'
                                >
                                    {menuFor === 'photo'
                                        ? <Images size={14} className='text-orange-400' />
                                        : <Film size={14} className='text-orange-400' />}
                                    Choose from Gallery
                                </button>
                            </div>
                        </>
                    )}
                    <input
                        ref={photoCaptureRef}
                        type='file'
                        accept='image/*'
                        capture='environment'
                        onChange={handleFiles}
                        className='hidden'
                    />
                    <input
                        ref={photoGalleryRef}
                        type='file'
                        accept='image/*'
                        onChange={handleFiles}
                        className='hidden'
                    />
                    <input
                        ref={videoCaptureRef}
                        type='file'
                        accept='video/*'
                        capture='environment'
                        onChange={handleFiles}
                        className='hidden'
                    />
                    <input
                        ref={videoGalleryRef}
                        type='file'
                        accept='video/*'
                        onChange={handleFiles}
                        className='hidden'
                    />
                </div>

                {/* Notes — slides open below the icon row, above the sets */}
                <div
                    className='grid mt-3'
                    style={{
                        gridTemplateRows: showNotes[idx] ? '1fr' : '0fr',
                        opacity: showNotes[idx] ? 1 : 0,
                        transition: 'grid-template-rows 300ms cubic-bezier(0.16,1,0.3,1), opacity 250ms ease'
                    }}
                >
                    <div className='overflow-hidden'>
                        <textarea
                            value={exerciseNotes?.[idx] || ''}
                            onChange={(e) => setNotes(idx, e.target.value)}
                            onInput={(e) => {
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            placeholder="Notes..."
                            rows={1}
                            className='w-full bg-black/30 text-white text-sm border border-orange-500/25 rounded-xl px-3 py-2 outline-none focus:border-orange-400 placeholder-neutral-500 resize-none overflow-hidden transition-all duration-300'
                        />
                    </div>
                </div>

                {/* Set input rows — scrollable when they don't fit */}
                <div
                    ref={setsScrollRef}
                    className='flex-1 min-h-0 overflow-y-auto scroll mt-1.5'
                >
                    <div className='flex flex-col gap-6 pt-3'>
                        {Array.from({ length: setCount }, (_, setIdx) => {
                            const done = !!exerciseDone[idx]?.[setIdx]
                            const unlocked = setIdx === 0 || !!exerciseDone[idx]?.[setIdx - 1]
                            const locked = done || !unlocked
                            return (
                                <div key={setIdx} className='flex items-center gap-2.5'>
                                    <div className='w-7 h-9 flex items-center justify-center shrink-0'>
                                        <div className={`w-7 h-7 rounded-full border border-orange-500/40 flex items-center justify-center transition-opacity ${locked ? 'opacity-40' : ''}`}>
                                            <span className='font-bebas text-orange-400 text-base leading-none'>{setIdx + 1}</span>
                                        </div>
                                    </div>
                                    {!isTimer && (
                                        <div className='flex-1 min-w-0 relative'>
                                            <label className='absolute -top-3.5 left-0 text-[9px] font-bold text-neutral-500 tracking-[2px]'>
                                                {isBodyweight ? 'TOTAL (KG)' : 'WEIGHT (KG)'}
                                            </label>
                                            <WeightCell
                                                value={exerciseWeights[idx]?.[setIdx] || ''}
                                                onChange={(val) => handleWeightChange(setIdx, val)}
                                                disabled={locked}
                                                suffix={isBodyweight ? 'BODYWEIGHT' : ''}
                                                bodyweight={bodyweight}
                                            />
                                        </div>
                                    )}
                                    <div className='flex-1 min-w-0 relative'>
                                        <label className='absolute -top-3.5 left-0 text-[9px] font-bold text-neutral-500 tracking-[2px]'>
                                            {isTimer ? 'TIME' : 'REPS'}
                                        </label>
                                        {isTimer ? (
                                            locked ? (
                                                <div className='w-full h-9 flex items-center justify-center bg-black/30 border border-white/15 rounded-xl font-bebas text-orange-400 text-lg opacity-60'>
                                                    {exerciseSets[idx]?.[setIdx] || '—'}
                                                </div>
                                            ) : (
                                                <NumberOfSets
                                                    mode='timer'
                                                    reps={exerciseSets[idx]?.[setIdx] || ''}
                                                    setReps={(_, val) => handleRepsChange(setIdx, val)}
                                                    idx={setIdx}
                                                    className='h-9'
                                                />
                                            )
                                        ) : (
                                            <input
                                                type='text'
                                                inputMode='numeric'
                                                value={exerciseSets[idx]?.[setIdx] || ''}
                                                disabled={locked}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    if (v === '' || /^\d+$/.test(v)) handleRepsChange(setIdx, v)
                                                }}
                                                placeholder='0'
className='w-full h-9 bg-black/30 border border-white/15 rounded-xl text-center font-bebas text-orange-400 text-lg outline-none placeholder-orange-400/40 disabled:cursor-not-allowed disabled:opacity-40'
                                            />
                                        )}
                                    </div>
                                    <div className='h-9 flex items-center shrink-0'>
                                        <button
                                            onClick={() => handleToggleDone(setIdx)}
                                            disabled={!unlocked}
className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all ${done
                                            ? 'border-white bg-white/20'
                                            : 'border-neutral-600 hover:border-neutral-400 hover:bg-white/5'
                                            } ${!unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                        title={!unlocked ? 'Complete the previous set first' : done ? 'Mark set incomplete' : 'Mark set complete'}
                                    >
                                        <Check size={15} className={done ? 'text-white' : 'text-transparent'} />
                                        </button>
                                    </div>
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

                {/* Badge ladder + PR — centered between set controls and rest timer */}
                <div className='flex flex-col items-center gap-0.5 pt-1.5 shrink-0'>
                    <div className='flex items-center gap-1.5 min-w-0'>
                        <span className='h-2.5 w-2.5 rounded-full shrink-0' style={{ background: displayColor }} />
                        <span className='font-mono text-[11px] whitespace-nowrap' style={{ color: displayColor }}>
                            {!laddersReady ? '…' : displayLevel === 0 ? 'UNRANKED' : displayLevelName.toUpperCase()}
                        </span>
                        {pr && (
                            <>
                                <span className='text-neutral-600 font-mono text-[11px]'>|</span>
                                <span className='font-mono text-[11px] text-orange-300 whitespace-nowrap'>
                                    PR : {pr.weight}kg × {pr.reps}
                                </span>
                            </>
                        )}
                    </div>
                    <span className={`font-mono text-[11px] whitespace-nowrap ${challengeHit ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        {challengeHit
                            ? 'CHALLENGE DONE ✓'
                            : !laddersReady
                                ? ''
                                : !ladder && !projected
                                    ? 'COMPLETE A SET TO RANK'
                                    : (() => {
                                        const target = projected ? projected.entry.nextTarget : ladder?.nextTarget
                                        const level = projected ? displayLevel + 1 : (ladder?.tier ?? 0) + 1
                                        if (target == null) return ''
                                        const atRepStage = isBodyweight && (ladder?.tier ?? displayLevel) === 0
                                        const load = atRepStage
                                            ? `BODYWEIGHT x ${target}reps`
                                            : `${fmtLoad(target)} x 6reps`
                                        return `FOR LEVEL ${level} : ${load}`
                                    })()
                        }
                    </span>
                </div>

                {/* Rest timer — always pinned to the bottom */}
                <div className='mt-auto pt-1.5'>
                    <RestTimer sound={sound} />
                </div>
            </div>
        </div>
    )
}

const SessionTracker = ({ exercises = [], plannedExercises = [], onRemove, onAddExercises, onSessionSaved, onJumpToExercise, exerciseWeights, exerciseSets, exerciseNotes, exerciseMedia, exerciseDone, exerciseSetCount, setWeight, setReps, setNotes, setMedia, setDone, setSetCount, currentIndex, setCurrentIndex, showNotes, setShowNotes, bodyweight = 0, sessions = [], ladders = null, onLiveLevelUp }) => {
    const [showNameModal, setShowNameModal] = useState(false)
    const [showWarnModal, setShowWarnModal] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [workoutName, setWorkoutName] = useState('')
    const [restSound, setRestSound] = useState(null)
    const [enterDir, setEnterDir] = useState('next')
    const [xpFlash, setXpFlash] = useState(null)

    useEffect(() => {
        getRestSound().then(s => { if (s) setRestSound(s) }).catch(() => {})
    }, [])

    useEffect(() => {
        if (!xpFlash) return
        const t = setTimeout(() => setXpFlash(null), 1700)
        return () => clearTimeout(t)
    }, [xpFlash])

    const handleLiveLevelUp = useCallback((info) => {
        onLiveLevelUp?.(info)
    }, [onLiveLevelUp])

    useEffect(() => {
        getRestSound().then(s => { if (s) setRestSound(s) }).catch(() => {})
    }, [])

    useEffect(() => {
        if (!xpFlash) return
        const t = setTimeout(() => setXpFlash(null), 1700)
        return () => clearTimeout(t)
    }, [xpFlash])

    const current = exercises.length === 0 ? 0 : Math.min(currentIndex, exercises.length - 1)
    const isLast = current === exercises.length - 1
    const selectedCount = plannedExercises.filter(ex => exercises.some(e => e.id === ex.id)).length
    const exerciseStarted = (idx) => Object.values(exerciseDone?.[idx] || {}).some(Boolean)
    const unfinished = exercises.filter((_, idx) => !exerciseStarted(idx))

    const handleSaveClick = () => {
        if (unfinished.length > 0) {
            setShowWarnModal(true)
            return
        }
        setWorkoutName('')
        setShowNameModal(true)
    }
    const handleConfirmSave = async () => {
        if (exercises.length === 0) return
        setShowNameModal(false)
        const now = new Date()
        const isTimer = (idx) => exercises[idx].mode === 'timer'
        const isBodyweight = (idx) => exercises[idx].mode === 'bodyweight'
        try {
            const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            const session = await createSession({
                date: `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
                name: workoutName.trim() || 'Workout',
                exercises: exercises.map((exercise, idx) => ({
                    name: exercise.name,
                    mode: exercise.mode === 'timer' ? 'timer' : exercise.mode === 'bodyweight' ? 'bodyweight' : 'weight',
                    category: exercise.category,
                    sets: Array.from({ length: Math.max(3, Math.min(10, exerciseSetCount?.[idx] || 3)) }, (_, setIdx) => ({
                        reps: exerciseSets[idx]?.[setIdx] || '—',
                        weight: isTimer(idx) ? '—' : (exerciseWeights[idx]?.[setIdx] ? `${exerciseWeights[idx][setIdx]}kg` : (isBodyweight(idx) ? '0kg' : '—'))
                    })),
                    notes: exerciseNotes?.[idx] || '',
                    media: exerciseMedia?.[idx] || []
                }))
            })
            if (onSessionSaved) await onSessionSaved(workoutName.trim() || 'Workout', session)
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
                        {exercises.map((ex, i) => {
                            const started = exerciseStarted(i)
                            return (
                                <button
                                    key={ex.id}
                                    onClick={() => onJumpToExercise(ex.id)}
                                    title={started ? `${ex.name} — started` : `${ex.name} — not started`}
                                    className={`h-[3px] rounded-full w-5 transition-all cursor-pointer ${i === current
                                        ? 'bg-orange-500'
                                        : started
                                            ? 'bg-emerald-400'
                                            : 'bg-neutral-800 hover:bg-neutral-600'
                                        }`}
                                />
                            )
                        })}
                    </div>
                </div>

                {/* Main exercise card — tinder-style deck */}
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
                                bodyweight={bodyweight}
                                sessions={sessions}
                                ladders={ladders}
                                onXpFlash={setXpFlash}
                                canPrev={current > 0}
                                canNext={!isLast}
                                onGoPrev={() => { setEnterDir('prev'); setCurrentIndex(current - 1) }}
                                onGoNext={() => { setEnterDir('next'); setCurrentIndex(current + 1) }}
                                onLevelUp={handleLiveLevelUp}
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
            {/* Incomplete-exercises warning modal */}
            {showWarnModal && (
                <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'>
                    <div className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'>
                        <h2 className='text-white text-xl font-bold font-mono mb-1'>Not finished yet</h2>
                        <p className='text-neutral-400 text-xs font-mono mb-3'>
                            {unfinished.length} exercise{unfinished.length > 1 ? 's' : ''} with no completed sets:
                        </p>
                        <ul className='flex flex-col gap-1.5 max-h-48 overflow-y-auto scroll mb-5'>
                            {unfinished.map(ex => (
                                <li
                                    key={ex.id}
                                    onClick={() => {
                                        setShowWarnModal(false)
                                        onJumpToExercise(ex.id)
                                    }}
                                    className='flex items-center gap-2.5 rounded-lg bg-neutral-900/70 border border-neutral-700 px-3 py-2 cursor-pointer hover:border-orange-500/50 transition-colors'
                                >
                                    <span className='w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0' />
                                    <span className='text-white text-sm font-mono truncate'>{ex.name}</span>
                                </li>
                            ))}
                        </ul>
                        <div className='flex gap-3'>
                            <button
                                onClick={() => setShowWarnModal(false)}
                                className='flex-1 border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Review
                            </button>
                            <button
                                onClick={() => {
                                    setShowWarnModal(false)
                                    setWorkoutName('')
                                    setShowNameModal(true)
                                }}
                                className='flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Save Anyway
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

            {/* Full-screen dim + XP flash */}
            {xpFlash && (
                <div key={xpFlash.id} className='fixed inset-0 z-[70] pointer-events-none'>
                    <motion.div
                        className='absolute inset-0 bg-black/70'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.7, times: [0, 0.15, 0.65, 1] }}
                    />
                    <div className='absolute right-4 top-[28%] rotate-[20deg] animate-xpFlash'>
                        <div className='relative flex items-center gap-1.5'>
                            {XP_BURST.map(p => (
                                <motion.span
                                    key={p.id}
                                    className='absolute rounded-sm'
                                    style={{ width: p.size, height: p.size, background: p.color, top: '50%', left: '50%' }}
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                    animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5, rotate: 180 }}
                                    transition={{ duration: 0.7, delay: p.delay, ease: 'easeOut' }}
                                />
                            ))}
                            <div className='flex items-center gap-2'>
                                {xpFlash.type === 'weight-pr' && <Flame size={18} className='text-orange-400' />}
                                {xpFlash.type === 'extra-rep' && <Zap size={18} className='text-orange-400' />}
                                {xpFlash.type === 'timer-record' && <Timer size={18} className='text-orange-400' />}
                                <span className='font-bold text-orange-300/80 text-2xl leading-none'>
                                    {xpFlash.type === 'weight-pr' ? 'NEW PR' : xpFlash.type === 'extra-rep' ? 'EXTRA REPS' : 'DURATION RECORD'}
                                </span>
                                <span className='font-bold text-orange-400 text-2xl tracking-wide leading-none drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]'>+{xpFlash.points} XP</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SessionTracker