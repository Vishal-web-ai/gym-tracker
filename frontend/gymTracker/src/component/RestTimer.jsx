import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Timer, Play, Square, ChevronUp, ChevronDown } from 'lucide-react'
import { getRestSound } from '../services/storage'
import { playBeep, ensureCtx } from '../services/audio'
import { buzzMed, buzzStrong } from '../services/haptics'

const PRESETS = [
    { label: '1:00', minutes: 1, seconds: 0 },
    { label: '2:00', minutes: 2, seconds: 0 },
    { label: '3:00', minutes: 3, seconds: 0 }
]

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

const SwipeStepper = ({ value, onChange }) => (
    <motion.div
        drag='y'
        dragConstraints={{ top: -48, bottom: 48 }}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragEnd={(e, info) => {
            if (info.offset.y < -28 || info.velocity.y < -350) {
                onChange(Math.min(59, value + 1))
            } else if (info.offset.y > 28 || info.velocity.y > 350) {
                onChange(Math.max(0, value - 1))
            }
        }}
        className='flex flex-col items-center cursor-grab active:cursor-grabbing touch-pan-y select-none'
    >
        <ChevronUp size={28} className='text-orange-500/60 pointer-events-none' />
        <span className='text-4xl text-white font-bold font-mono w-16 text-center'>
            {String(value).padStart(2, '0')}
        </span>
        <ChevronDown size={28} className='text-orange-500/60 pointer-events-none' />
    </motion.div>
)

const RestTimer = ({ sound }) => {
    const [open, setOpen] = useState(false)
    const [minutes, setMinutes] = useState(1)
    const [seconds, setSeconds] = useState(0)
    const [running, setRunning] = useState(false)
    const [done, setDone] = useState(false)
    const [remaining, setRemaining] = useState(0)
    const endTimeRef = useRef(0)
    const alarmTimerRef = useRef(null)
    const audioRef = useRef(null)
    const alarmUrlRef = useRef(null)
    const lastClickRef = useRef(0)
    const clickTimerRef = useRef(null)

    const stopAlarm = useCallback(() => {
        if (alarmTimerRef.current) {
            clearInterval(alarmTimerRef.current)
            alarmTimerRef.current = null
        }
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ''
            audioRef.current = null
        }
        if (alarmUrlRef.current) {
            URL.revokeObjectURL(alarmUrlRef.current)
            alarmUrlRef.current = null
        }
        setDone(false)
    }, [])

    useEffect(() => () => {
        if (alarmTimerRef.current) clearInterval(alarmTimerRef.current)
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ''
        }
        if (alarmUrlRef.current) URL.revokeObjectURL(alarmUrlRef.current)
    }, [])

    const playAlarmSound = useCallback(async () => {
        let activeSound = sound
        if (!activeSound) {
            try {
                activeSound = await getRestSound()
            } catch {
                // ignore
            }
        }
        if (activeSound?.blob) {
            const url = URL.createObjectURL(activeSound.blob)
            const audio = new Audio(url)
            audio.loop = true
            audio.play().catch(() => {})
            audioRef.current = audio
            alarmUrlRef.current = url
        } else {
            playBeep()
            alarmTimerRef.current = setInterval(playBeep, 1000)
        }
    }, [sound])

    const total = minutes * 60 + seconds
    const displayed = running || done ? remaining : (remaining > 0 ? remaining : total)

    const start = useCallback(() => {
        stopAlarm()
        try {
            ensureCtx()
        } catch {
            // audio unavailable
        }
        const from = remaining > 0 ? remaining : total
        endTimeRef.current = Date.now() + from * 1000
        setRemaining(from)
        setRunning(true)
        setOpen(false)
        buzzMed()
    }, [stopAlarm, total, remaining])

    const stop = useCallback(() => {
        stopAlarm()
        setRunning(false)
        buzzMed()
    }, [stopAlarm])

    const restart = useCallback(() => {
        stopAlarm()
        setRemaining(total)
        buzzMed()
    }, [stopAlarm, total])

    const handlePlayClick = useCallback(() => {
        const now = Date.now()
        if (now - lastClickRef.current < 300) {
            clearTimeout(clickTimerRef.current)
            lastClickRef.current = 0
            restart()
            return
        }
        lastClickRef.current = now
        if (running || done) {
            stop()
            return
        }
        clickTimerRef.current = setTimeout(() => start(), 300)
    }, [running, done, start, stop, restart])

    useEffect(() => {
        if (!running) return
        const tick = () => {
            const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
            setRemaining(left)
            if (left <= 0) {
                setRunning(false)
                setDone(true)
                playAlarmSound()
                buzzStrong()
            }
        }
        tick()
        const id = setInterval(tick, 250)
        return () => clearInterval(id)
    }, [running, playAlarmSound])

    return (
        <>
            <div
                className={`w-full flex items-center justify-between rounded-2xl px-4 py-2 transition-all duration-300 ${
                    running || done
                        ? 'bg-orange-500/10 border border-orange-400/60 animate-pulse'
                        : 'bg-black/30 border border-orange-500/35 hover:border-orange-400/70'
                }`}
            >
                <button
                    onClick={() => setOpen(true)}
                    className='flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer'
                    title='Rest timer'
                >
                    <div className='w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0'>
                        <Timer size={16} className='text-orange-400' />
                    </div>
                    <div className='text-left'>
                        <p className='text-[9px] font-bold text-neutral-400 tracking-[2px]'>
                            {running ? 'RESTING' : 'REST TIMER'}
                        </p>
                        <p className='font-bebas text-orange-400 text-[22px] leading-none mt-1'>
                            {formatTime(displayed)}
                        </p>
                    </div>
                </button>
                <button
                    onClick={handlePlayClick}
                    className='w-10 h-10 rounded-full border border-orange-500/50 flex items-center justify-center shrink-0 cursor-pointer hover:bg-orange-500/10 transition-all'
                    title={running || done ? 'Stop timer (double-click to restart)' : 'Start timer'}
                >
                    {running || done ? (
                        <Square size={13} className='text-orange-400' />
                    ) : (
                        <Play size={16} className='text-orange-400 fill-orange-400 ml-0.5' />
                    )}
                </button>
            </div>

            {open && (
                <div
                    className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'
                    onClick={() => setOpen(false)}
                >
                    <div
                        className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className='font-bebas text-orange-500 tracking-[2px] text-2xl text-center mb-4'>
                            REST TIMER
                        </h2>
                        <div className='flex justify-center gap-2 mb-5 flex-wrap'>
                            {PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => {
                                        setMinutes(p.minutes)
                                        setSeconds(p.seconds)
                                    }}
                                    className={`px-3 py-1 rounded-lg font-mono text-sm font-semibold transition-all cursor-pointer ${
                                        minutes === p.minutes && seconds === p.seconds
                                            ? 'bg-orange-500 text-black'
                                            : 'border border-orange-500/40 text-orange-500 hover:bg-orange-500/10'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className='flex items-center justify-center gap-3'>
                            <SwipeStepper value={minutes} onChange={setMinutes} />
                            <span className='text-4xl text-orange-500 font-bold -mt-2'>:</span>
                            <SwipeStepper value={seconds} onChange={setSeconds} />
                        </div>
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setOpen(false)}
                                className='flex-1 border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={start}
                                className='flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all duration-300 cursor-pointer font-mono'
                            >
                                {running ? 'Restart' : 'Start'}
                            </button>
                        </div>
                        {running && (
                            <button
                                onClick={stop}
                                className='w-full mt-3 rounded-xl py-3 font-mono font-bold text-red-400 cursor-pointer hover:bg-red-500/10 transition-all'
                            >
                                Stop Timer
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default RestTimer
