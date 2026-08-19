import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Zap, Flame, Timer, CheckCircle2, Circle } from 'lucide-react'
import RankIcon from './RankIcon'

const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: `${(i * 137) % 100}%`,
    delay: (i % 6) * 0.08,
    color: ['#f97316', '#fbbf24', '#fb923c', '#c2410c'][i % 4],
    size: 6 + (i % 4) * 3
}))

const BONUS_LABEL = {
    'weight-pr': { label: 'NEW PR', icon: Flame },
    'extra-rep': { label: 'EXTRA REPS', icon: Zap },
    'timer-record': { label: 'DURATION RECORD', icon: Timer }
}

function BonusChip({ bonus }) {
    const spec = BONUS_LABEL[bonus.type] || { label: 'BONUS', icon: Zap }
    const Icon = spec.icon
    return (
        <div className='flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1'>
            <Icon size={12} className='text-orange-500' />
            <p className='font-mono text-[9px] text-orange-300'>
                +{bonus.points} XP · {spec.label} · {bonus.name}
            </p>
        </div>
    )
}

const challengeTarget = (t) => {
    if (t.kind === 'weight') return `${t.hint} ${t.value}kg`
    if (t.kind === 'reps') return `${t.hint} x${t.value}`
    return `${t.hint} ${t.value}min`
}

export default function LevelUpOverlay({ rank, breakdown = null, isLevelUp = false, progress = null, onClose }) {
    const [phase, setPhase] = useState(isLevelUp ? 'celebrate' : 'summary')

    useEffect(() => {
        if (isLevelUp && phase === 'celebrate') {
            const t = setTimeout(() => setPhase('summary'), 2800)
            return () => clearTimeout(t)
        }
    }, [isLevelUp, phase])

    const xpTotal = breakdown?.xp ?? null
    const bonusCount = breakdown?.bonuses?.length || 0
    const groups = progress?.challenges?.[rank.level - 1]?.groups || []
    const doneCount = groups.filter((g) => g.done).length
    const nextThreshold = progress?.rank?.nextThreshold
    const totalFraction = nextThreshold != null ? Math.min((progress?.xp ?? 0) / nextThreshold, 1) : 1
    const gainFrac = xpTotal ? Math.max(0, Math.min(xpTotal / (nextThreshold ?? 1), totalFraction)) : 0

    return (
        <AnimatePresence>
            <motion.div
                className='fixed inset-0 z-[80] flex items-center justify-center px-6 bg-black/70'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
            >
                <AnimatePresence mode='wait'>
                    {phase === 'celebrate' ? (
                        <motion.div
                            key='celebrate'
                            className='relative w-full max-w-[340px] border rounded-3xl p-6 flex flex-col items-center gap-4'
                            style={{ borderColor: rank.color, background: 'rgba(10,10,10,0.97)', boxShadow: `0 0 40px ${rank.color}66` }}
                            initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                        >
                            {CONFETTI.map((c) => (
                                <motion.span
                                    key={c.id}
                                    className='absolute rounded-sm'
                                    style={{ left: c.x, top: '-5%', width: c.size, height: c.size, background: c.color }}
                                    initial={{ y: 0, rotate: 0, opacity: 1 }}
                                    animate={{ y: '115vh', rotate: 360, opacity: [1, 1, 0] }}
                                    transition={{ duration: 1.6, delay: c.delay, ease: 'easeIn' }}
                                />
                            ))}

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.25, 1] }}
                                transition={{ delay: 0.15, duration: 0.5 }}
                            >
                                <RankIcon rank={rank} size={100} />
                            </motion.div>

                            <p className='font-bebas tracking-[4px] text-3xl' style={{ color: rank.color }}>
                                RANK UP!
                            </p>
                            <p className='font-bebas tracking-[2px] text-2xl text-white'>{rank.name.toUpperCase()}</p>
                            {xpTotal != null && (
                                <p className='font-mono text-orange-400 text-sm'>+{xpTotal} XP</p>
                            )}

                            <button
                                onClick={() => setPhase('summary')}
                                className='w-full border rounded-2xl py-2.5 font-bebas tracking-[2px] text-lg cursor-pointer hover:opacity-80 transition-opacity'
                                style={{ borderColor: rank.color, color: rank.color }}
                            >
                                VIEW SUMMARY
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key='summary'
                            className='relative w-full max-w-[340px] border rounded-3xl p-6 flex flex-col gap-4'
                            style={{ borderColor: rank.color, background: 'rgba(10,10,10,0.97)', boxShadow: `0 0 40px ${rank.color}55` }}
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                        >
                            <button
                                onClick={onClose}
                                className='absolute top-3 right-3 text-white/40 hover:text-white cursor-pointer'
                                aria-label='Close'
                            >
                                <X size={20} />
                            </button>

                            <div className='flex items-center gap-3'>
                                <RankIcon rank={rank} size={44} />
                                <div>
                                    <p className='font-bebas tracking-[2px] text-2xl text-white leading-none'>{rank.name.toUpperCase()}</p>
                                    <p className='font-mono text-white/40 text-xs mt-1'>{isLevelUp ? 'RANK UP!' : 'WORKOUT COMPLETE'}</p>
                                </div>
                            </div>

                            {/* XP progress bar with this session's gain highlighted */}
                            <div>
                                <div className='flex justify-between mb-1'>
                                    <span className='font-mono text-[10px] text-white/40 tracking-[1px]'>XP PROGRESS</span>
                                    <span className='font-mono text-[10px] text-white/50'>{progress?.xp ?? 0}xp / {nextThreshold != null ? `${nextThreshold}xp` : 'MAX'}</span>
                                </div>
                                <div className='h-3 rounded-full bg-white/10 overflow-hidden'>
                                    <div className='h-full relative transition-all duration-700' style={{ width: `${Math.round(totalFraction * 100)}%`, background: rank.color, boxShadow: `0 0 12px ${rank.color}88` }}>
                                        {gainFrac > 0 && (
                                            <motion.div
                                                className='absolute h-full right-0 top-0 bg-white/50'
                                                style={{ boxShadow: '0 0 14px #fff' }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.round(gainFrac * 100)}%` }}
                                                transition={{ delay: 0.6, duration: 0.7, ease: 'easeOut' }}
                                            />
                                        )}
                                    </div>
                                </div>
                                {xpTotal != null && (
                                    <p className='font-bebas text-orange-400 tracking-[1px] mt-1'>+{xpTotal} XP THIS SESSION</p>
                                )}
                            </div>

                            {/* Challenges for the current rank */}
                            <div className='flex flex-col gap-1.5 w-full'>
                                <div className='flex items-center justify-between'>
                                    <p className='font-mono text-[9px] tracking-[2px] text-white/40'>CHALLENGES TO COMPLETE THIS RANK</p>
                                    <p className='font-mono text-[10px] text-orange-400'>{doneCount}/{groups.length} COMPLETED</p>
                                </div>
                                {groups.map((ch) => (
                                    <div key={ch.key} className='flex items-center gap-2'>
                                        {ch.done ? <CheckCircle2 size={16} className='text-emerald-400 shrink-0' /> : <Circle size={16} className='text-white/25 shrink-0' />}
                                        <span className={`font-mono text-[10px] leading-tight ${ch.done ? 'text-white/35 line-through' : 'text-white/70'}`}>
                                            {ch.label}
                                        </span>
                                        <span className='ml-auto font-mono text-[9px] text-white/30'>{ch.targets.map(challengeTarget).join(' · ')}</span>
                                    </div>
                                ))}
                            </div>

                            {bonusCount > 0 && (
                                <div className='flex flex-col gap-1.5 w-full'>
                                    <p className='font-mono text-white/40 text-[10px] tracking-[2px]'>BONUSES EARNED</p>
                                    <div className='flex flex-wrap gap-1.5'>
                                        {breakdown.bonuses.map((b, i) => <BonusChip key={i} bonus={b} />)}
                                    </div>
                                </div>
                            )}

                            <div className='flex items-center gap-1.5 text-white/50'>
                                <Plus size={12} className='text-orange-500' />
                                <p className='font-mono text-[9px]'>Every session = {breakdown?.base ?? 20} XP</p>
                            </div>

                            <button
                                onClick={onClose}
                                className='mt-1 w-full border rounded-2xl py-2.5 font-bebas tracking-[2px] text-lg cursor-pointer hover:opacity-80 transition-opacity'
                                style={{ borderColor: rank.color, color: rank.color }}
                            >
                                KEEP GRINDING
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    )
}