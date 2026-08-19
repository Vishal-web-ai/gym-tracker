import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import RankIcon from './RankIcon'
import { RANKS, EXERCISE_RANKS, refreshProgress, xpThresholdForLevel, getChallengeChecks, saveChallengeChecks } from '../services/progression'

const slideVariants = {
    enter: (dir) => ({ y: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (dir) => ({ y: dir > 0 ? '-100%' : '100%', opacity: 0 })
}

export default function RankScreen({ onClose }) {
    const [progress, setProgress] = useState(null)
    const [view, setView] = useState('rank')
    const [activeIndex, setActiveIndex] = useState(0)
    const [dir, setDir] = useState(0)
    const [checks, setChecks] = useState({})

    useEffect(() => {
        let cancelled = false
        Promise.all([refreshProgress(), getChallengeChecks()])
            .then(([result, savedChecks]) => {
                if (cancelled) return
                const level = result.progress.rank.level
                setProgress(result.progress)
                setActiveIndex(level - 1)
                setChecks(savedChecks)
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [])

    const toggleCheck = (level, groupKey) => {
        setChecks((prev) => {
            const key = `${level}:${groupKey}`
            const next = { ...prev, [key]: !prev[key] }
            saveChallengeChecks(next)
            return next
        })
    }

    const goTo = (i) => {
        const clamped = Math.max(0, Math.min(i, RANKS.length - 1))
        setDir(clamped > activeIndex ? 1 : -1)
        setActiveIndex(clamped)
    }

    const rank = progress?.rank
    const rankLevel = progress?.rank?.level

    const challengeLabel = (ch) => ch.targets.map((t) => {
        if (t.kind === 'weight') return `${t.hint} ${t.value}kg`
        if (t.kind === 'reps') return `${t.hint} x${t.value}`
        return `${t.hint} ${t.value}min`
    }).join(' · ')

    return (
        <div className='fixed inset-0 bg-neutral-900 z-50 flex flex-col'>
            <div className='flex items-center justify-between px-5 h-16 border-b border-neutral-700 shrink-0'>
                <h1 className='text-white text-xl font-bold font-mono'>My Ranks</h1>
                <X onClick={onClose} className='text-white cursor-pointer hover:opacity-70' size={28} />
            </div>

            <div className='flex-1 p-4 flex flex-col gap-4 min-h-0'>
                <div className='flex items-center gap-2 self-center rounded-full border border-white/15 bg-white/5 p-1'>
                    <button onClick={() => setView('rank')}
                        className={`rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[1px] transition-all cursor-pointer ${
                            view === 'rank' ? 'bg-orange-500 text-black' : 'text-white/50 hover:text-white/80'
                        }`}>
                        RANK BADGE
                    </button>
                    <button onClick={() => setView('exercise')}
                        className={`rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[1px] transition-all cursor-pointer ${
                            view === 'exercise' ? 'bg-orange-500 text-black' : 'text-white/50 hover:text-white/80'
                        }`}>
                        MY EXERCISE BADGE
                    </button>
                </div>

                <div className='rounded-2xl border border-white/10 bg-[rgba(10,10,10,0.85)] p-4 flex flex-col flex-1 min-h-0'>
                    {view === 'rank' ? (
                        <>
                            <p className='font-bebas tracking-[2px] text-orange-500 text-lg mb-2'>RANK BADGES</p>
                            <div className='flex-1 relative min-h-0 overflow-hidden'>
                                <AnimatePresence mode='popLayout' initial={false} custom={dir}>
                                    {RANKS.map((r, i) => {
                                        if (i !== activeIndex) return null
                                        const reached = rankLevel != null && i + 1 <= rankLevel
                                        const isCurrent = rankLevel != null && i + 1 === rankLevel
                                        const fill = isCurrent ? (rank?.progress ?? 0) : reached ? 1 : 0
                                        const xp = xpThresholdForLevel(i + 1)
                                        return (
                                            <motion.div
                                                key={r.name}
                                                custom={dir}
                                                variants={slideVariants}
                                                initial='enter'
                                                animate='center'
                                                exit='exit'
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                drag='y'
                                                dragConstraints={{ top: 0, bottom: 0 }}
                                                dragElastic={0.4}
                                                onDragEnd={(_, info) => {
                                                    if (info.offset.y < -60 || info.velocity.y < -400) goTo(activeIndex + 1)
                                                    else if (info.offset.y > 60 || info.velocity.y > 400) goTo(activeIndex - 1)
                                                }}
                                                className='absolute inset-0 flex flex-col items-center justify-center gap-2.5 cursor-grab active:cursor-grabbing px-6 overflow-y-auto scroll'
                                                style={{ background: `radial-gradient(circle at 50% 32%, ${r.color}1f, transparent 62%)` }}
                                            >
                                                <div className='relative flex items-center justify-center'>
                                                    <div className='absolute w-36 h-36 rounded-full'
                                                        style={{ background: r.color, filter: 'blur(36px)', opacity: reached ? 0.35 : 0.08 }} />
                                                    <RankIcon rank={r} size={120} unlocked={reached} />
                                                </div>
                                                <p className='font-bebas tracking-[3px] text-3xl'
                                                    style={{ color: reached ? r.color : '#52525b', textShadow: reached ? `0 0 24px ${r.color}55` : 'none' }}>
                                                    {r.name.toUpperCase()}
                                                </p>
                                                <div className='w-44 max-w-[70%] h-2 rounded-full bg-white/10 overflow-hidden'>
                                                    <div className='h-full rounded-full transition-all duration-500'
                                                        style={{ width: `${Math.round(fill * 100)}%`, background: r.color, boxShadow: `0 0 12px ${r.color}88` }} />
                                                </div>
                                                <p className='font-mono text-xs'>
                                                    {isCurrent ? (
                                                        fill >= 1 ? (
                                                            <span className='text-orange-500'>CHALLENGES LEFT TO ADVANCE</span>
                                                        ) : (
                                                            <span className='text-orange-500'>{progress?.xp}xp / {rank?.nextThreshold}xp</span>
                                                        )
                                                    ) : reached ? (
                                                        <span className='text-white/50'>REACHED</span>
                                                    ) : (
                                                        <span className='text-white/50'>{xp} XP NEEDED</span>
                                                    )}
                                                </p>
                                                <div className='flex flex-col gap-1 w-full mt-1'>
                                                    <p className='font-mono text-[9px] tracking-[2px] text-white/40 text-center'>CHALLENGES</p>
                                                    <p className='font-mono text-[8px] leading-snug text-white/30 text-center'>(RULES: 8 REPS PER SET · CLEAR ANY 1 EXERCISE IN A GROUP)</p>
                                                    {(progress?.challenges?.[i]?.groups || []).map((ch) => {
                                                        const checked = ch.done || !!checks[`${i + 1}:${ch.key}`]
                                                        return (
                                                            <div key={ch.key} className='cursor-pointer select-none group' onClick={() => toggleCheck(i + 1, ch.key)}>
                                                                <div className='flex items-center gap-2'>
                                                                    <span className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-all ${
                                                                        checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/25 group-hover:border-white/60'
                                                                    }`}>
                                                                        {checked && (
                                                                            <svg width='10' height='10' viewBox='0 0 24 24' fill='none'>
                                                                                <path d='M5 13l4 4L19 7' stroke='black' strokeWidth='3.5' strokeLinecap='round' strokeLinejoin='round' />
                                                                            </svg>
                                                                        )}
                                                                    </span>
                                                                    <span className={`font-mono text-[10px] leading-snug transition-all ${checked ? 'text-white/35 line-through' : 'text-white/70'}`}>
                                                                        {ch.label}
                                                                    </span>
                                                                </div>
                                                                <p className={`pl-6 font-mono text-[9px] leading-snug transition-all ${checked ? 'text-white/20 line-through' : 'text-white/35'}`}>
                                                                    {challengeLabel(ch)}
                                                                </p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className='font-bebas tracking-[2px] text-orange-500 text-lg mb-3'>MY EXERCISE BADGE</p>
                            {!rank ? (
                                <p className='font-mono text-white/40 text-sm'>Loading...</p>
                            ) : progress.exerciseRanks.length === 0 ? (
                                <p className='font-mono text-white/40 text-sm'>Log some sets to start ranking your exercises.</p>
                            ) : (
                                <div className='flex-1 overflow-y-auto scroll flex flex-col gap-2.5 pr-1'>
                                    {progress.exerciseRanks.map((e) => {
                                    const isTimer = e.mode === 'timer'
                                    const cur = isTimer ? e.duration : e.weight
                                    const nextVal = e.score > 0 && e.rank.nextScore != null
                                        ? Math.round((cur / e.score) * e.rank.nextScore)
                                        : null
                                    const nextName = e.rank.nextScore != null ? EXERCISE_RANKS[e.rank.tier + 1].name : null
                                    return (
                                        <div key={e.name} className='flex flex-col gap-1'>
                                            <div className='flex items-center gap-2'>
                                                <p className='font-mono text-white/80 text-sm flex-1 truncate'>{e.name}</p>
                                                <p className='font-bebas text-xs tracking-[1px]' style={{ color: e.rank.color }}>
                                                    {e.rank.name.toUpperCase()}
                                                </p>
                                                <p className='font-mono text-white/30 text-[10px]'>
                                                    {cur ? (isTimer ? `${cur}s` : `${cur}kg`) : '—'}
                                                    {nextVal != null ? ` / ${nextVal}${isTimer ? 's' : 'kg'}` : ''}
                                                </p>
                                            </div>
                                            <div className='h-1.5 rounded-full bg-white/10 overflow-hidden'>
                                                <div className='h-full rounded-full' style={{ width: `${Math.round(e.rank.progress * 100)}%`, background: e.rank.color }} />
                                            </div>
                                            <p className='font-mono text-white/30 text-[9px]'>
                                                {nextVal != null ? `${Math.max(0, nextVal - cur)}${isTimer ? 's' : 'kg'} to ${nextName.toUpperCase()}` : 'MAX TIER'}
                                            </p>
                                        </div>
                                    )
                                })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
