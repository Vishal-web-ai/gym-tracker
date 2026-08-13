import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Heart, Snowflake, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSessions, toDayKey } from '../services/storage'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CALENDAR_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getWeekDates() {
    const today = new Date()
    const mondayOffset = (today.getDay() + 6) % 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - mondayOffset)

    return DAYS.map((_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return d
    })
}

function isToday(date) {
    const now = new Date()
    return date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
}

function isBeforeToday(date) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d < now
}

function getCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const grid = []
    let row = []
    for (let i = 0; i < startOffset; i++) {
        row.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
        row.push(new Date(year, month, d))
        if (row.length === 7) {
            grid.push(row)
            row = []
        }
    }
    if (row.length > 0) {
        while (row.length < 7) row.push(null)
        grid.push(row)
    }
    return grid
}

function FlameIcon() {
    return (
        <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 8, stiffness: 200 }}
        >
            <Flame size={22} color="white" fill="white" strokeWidth={2} className='w-[18px] h-[18px]' />
        </motion.span>
    )
}

function IceCrystal() {
    return (
        <motion.span
            animate={{ rotate: [0, 45, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center justify-center"
        >
            <Snowflake size={22} color="#7cc4ff" strokeWidth={2.5} className='w-[18px] h-[18px]' />
        </motion.span>
    )
}

function RelaxIcon() {
    return (
        <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
            <Heart size={16} color="white" fill="white" strokeWidth={2} />
        </motion.span>
    )
}

export default function Streak({ refreshKey = 0 }) {
    const [sessions, setSessions] = useState([])
    const [joinedAt, setJoinedAt] = useState(null)
    const [showCalendar, setShowCalendar] = useState(false)
    const [calYear, setCalYear] = useState(new Date().getFullYear())
    const [calMonth, setCalMonth] = useState(new Date().getMonth())

    useEffect(() => {
        let cancelled = false
        getSessions()
            .then((all) => {
                if (cancelled) return
                const keys = all.map((s) => toDayKey(s.createdAt)).filter(Boolean).sort()
                setSessions(all)
                setJoinedAt(keys.length ? new Date(`${keys[0]}T00:00:00`) : null)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [refreshKey])

    const doneDays = new Set(sessions.map((s) => toDayKey(s.createdAt)))

    const isDateCompleted = (date) => doneDays.has(toDayKey(date))

    const isBeforeJoin = (date) => joinedAt && toDayKey(date) < toDayKey(joinedAt)

    const isMissed = (date) => {
        if (isDateCompleted(date)) return false
        if (isToday(date)) return false
        if (date.getDay() === 0) return false
        if (isBeforeJoin(date)) return false
        return isBeforeToday(date)
    }

    const weekDates = getWeekDates()

    const openCalendar = () => {
        const now = new Date()
        setCalYear(now.getFullYear())
        setCalMonth(now.getMonth())
        setShowCalendar(true)
    }

    const calendarGrid = getCalendarGrid(calYear, calMonth)

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={openCalendar}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openCalendar()
                    }
                }}
                className="flex items-center justify-center gap-2.5 cursor-pointer"
            >
                {weekDates.map((date, i) => {
                    const done = isDateCompleted(date)
                    const missed = isMissed(date)
                    return (
                        <div key={i} className="flex flex-col items-center">
                            <p className="font-mono text-white/60 mb-1 text-[10px]">{DAYS[i]}</p>
                            <div
                                className={`rounded-full flex items-center justify-center w-[34px] h-[34px] ${
                                    done ? 'bg-orange-500' : missed ? 'border-2 border-blue-400' : isBeforeJoin(date) ? '' : 'border-2 border-orange-500'
                                }`}
                            >
                                {done && <FlameIcon />}
                                {missed && <IceCrystal />}
                            </div>
                            <p className="font-mono text-white/60 mt-1 text-[10px]">{date.getDate()}</p>
                        </div>
                    )
                })}
            </div>

            <AnimatePresence>
                {showCalendar && (
                    <motion.div
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowCalendar(false)}
                    >
                        <motion.div
                            className="relative w-full max-w-[380px] border border-orange-500/30 rounded-3xl p-5 bg-[rgba(10,10,10,0.95)] shadow-[0_8px_25px_rgba(249,115,22,0.4)] max-h-[90vh] overflow-y-auto scroll"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => {
                                        if (calMonth === 0) {
                                            setCalYear((prev) => prev - 1)
                                            setCalMonth(11)
                                        } else {
                                            setCalMonth((prev) => prev - 1)
                                        }
                                    }}
                                    className="p-2 cursor-pointer"
                                >
                                    <ChevronLeft size={20} color="#f97316" />
                                </button>
                                <p className="font-bebas text-orange-500 tracking-[2px] text-xl">
                                    {MONTH_NAMES[calMonth]} {calYear}
                                </p>
                                <button
                                    onClick={() => {
                                        if (calMonth === 11) {
                                            setCalYear((prev) => prev + 1)
                                            setCalMonth(0)
                                        } else {
                                            setCalMonth((prev) => prev + 1)
                                        }
                                    }}
                                    className="p-2 cursor-pointer"
                                >
                                    <ChevronRight size={20} color="#f97316" />
                                </button>
                            </div>

                            <div className="flex mb-2">
                                {CALENDAR_DAYS.map((d) => (
                                    <div key={d} className="flex-1 flex justify-center">
                                        <p className="font-mono text-white/40 text-[10px]">{d}</p>
                                    </div>
                                ))}
                            </div>

                            {calendarGrid.map((week, wi) => (
                                <div key={wi} className="flex">
                                    {week.map((date, di) => {
                                        if (!date) return <div key={`${wi}-${di}`} className="flex-1" style={{ height: 40 }} />
                                        const isTodayDate = isToday(date)
                                        const completed = isDateCompleted(date)
                                        const missed = isMissed(date)
                                        const isSunday = date.getDay() === 0
                                        const isPastOrToday = isBeforeToday(date) || isTodayDate
                                        const afterJoin = joinedAt ? toDayKey(date) >= toDayKey(joinedAt) : true

                                        if (!afterJoin) return <div key={`${wi}-${di}-empty`} className="flex-1" style={{ height: 40 }} />

                                        return (
                                            <div key={toDayKey(date)} className="flex-1 flex items-center justify-center py-0.5">
                                                <div
                                                    className={`rounded-full flex items-center justify-center ${
                                                        completed ? 'bg-orange-500' : (isSunday && isPastOrToday) ? 'bg-green-500' : missed ? 'bg-blue-500' : isTodayDate ? 'border-2 border-orange-500' : ''
                                                    }`}
                                                    style={{ width: 36, height: 36 }}
                                                >
                                                    {completed && <Flame size={16} color="white" fill="white" strokeWidth={2} />}
                                                    {(isSunday && isPastOrToday) && <RelaxIcon />}
                                                    {missed && <span className="bg-white rounded-[2px]" style={{ width: 8, height: 8 }} />}
                                                    {!completed && !(isSunday && isPastOrToday) && !missed && (
                                                        <p className={`font-mono text-[11px] ${isTodayDate ? 'text-orange-500' : 'text-white/30'}`}>
                                                            {date.getDate()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}

                            <button
                                onClick={() => setShowCalendar(false)}
                                className="mt-4 w-full border border-orange-500/40 rounded-2xl flex items-center justify-center py-2.5 cursor-pointer hover:bg-orange-500/10 transition-colors"
                            >
                                <p className="font-bebas text-orange-500 tracking-[2px] text-lg">CLOSE</p>
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
