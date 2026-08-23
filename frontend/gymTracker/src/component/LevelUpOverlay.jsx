import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Zap, Flame, Timer, CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import RankIcon from './RankIcon'
import { RANKS } from '../services/progression'

const BONUS_LABEL = {
    'weight-pr': { label: 'NEW PR', icon: Flame },
    'extra-rep': { label: 'EXTRA REPS', icon: Zap },
    'timer-record': { label: 'DURATION RECORD', icon: Timer }
}

const challengeTarget = (ch) => {
    if (ch.kind === 'weight') return `${ch.value}kg`
    if (ch.kind === 'reps') return `${ch.value} reps`
    return `${ch.value}min`
}

function groupBonusesByExercise(bonuses) {
    if (!bonuses?.length) return []
    const map = new Map()
    for (const b of bonuses) {
        const key = b.name || 'Unknown'
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(b)
    }
    return [...map.entries()]
}

function ExerciseGroup({ name, bonuses }) {
    const totalXp = bonuses.reduce((sum, b) => sum + b.points, 0)
    return (
        <div className='rounded-xl border border-orange-500/30 bg-orange-500/5 px-3 py-2.5'>
            <div className='flex items-center justify-between mb-1.5'>
                <p className='font-mono text-[10px] text-white/70 truncate'>{name}</p>
                <p className='font-mono text-[10px] text-orange-400 tracking-wider'>+{totalXp} XP</p>
            </div>
            <div className='flex flex-col gap-1'>
                {bonuses.map((b, i) => {
                    const spec = BONUS_LABEL[b.type] || { label: 'BONUS', icon: Zap }
                    const Icon = spec.icon
                    return (
                        <div key={i} className='flex items-center gap-2'>
                            <Icon size={10} className='text-orange-400/70 shrink-0' />
                            <p className='font-mono text-[9px] text-white/50'>{spec.label}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function LevelUpOverlay({ rank, breakdown = null, isLevelUp = false, progress = null, onClose }) {
    const xpTotal = breakdown?.xp ?? null
    const groups = progress?.challenges?.[rank.level - 1]?.groups || []
    const doneCount = groups.filter((g) => g.done).length
    const nextThreshold = progress?.rank?.nextThreshold
    const currentXp = progress?.xp ?? 0
    const prevXp = xpTotal != null ? Math.max(0, currentXp - xpTotal) : currentXp
    const totalFraction = nextThreshold != null ? Math.min(currentXp / nextThreshold, 1) : 1
    const prevFraction = nextThreshold != null ? Math.min(prevXp / nextThreshold, 1) : 0
    const xpRemaining = nextThreshold != null ? Math.max(0, nextThreshold - currentXp) : 0
    const isMaxRank = nextThreshold == null

    const prevRank = rank.level > 1 ? RANKS[rank.level - 2] : null
    const nextRank = rank.level < RANKS.length ? RANKS[rank.level] : null

    return (
        <AnimatePresence>
            <motion.div
                className='fixed inset-0 z-[80] flex items-center justify-center px-5 bg-black/75'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
            >
                <motion.div
                    key='card'
                    className='relative w-full max-w-[360px] max-h-[88vh] border rounded-3xl flex flex-col overflow-hidden'
                    style={{ borderColor: rank.color + '30', background: 'rgba(10,10,10,0.98)', boxShadow: `0 0 50px ${rank.color}15` }}
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                >
                    <button
                        onClick={onClose}
                        className='absolute top-3.5 right-3.5 z-10 text-white/30 hover:text-white/60 cursor-pointer transition-colors'
                        aria-label='Close'
                    >
                        <X size={18} />
                    </button>

                    <div className='flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-4 scroll'>
                        {/* Hero: Rank Icon */}
                        <motion.div
                            className='flex flex-col items-center'
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                            <div className='relative mb-3'>
                                <RankIcon rank={rank} size={72} />
                                <div
                                    className='absolute inset-0 rounded-full blur-xl opacity-20'
                                    style={{ background: rank.color }}
                                />
                            </div>

                            <p className='font-bebas text-[28px] leading-none tracking-[3px]' style={{ color: rank.color }}>
                                {rank.name.toUpperCase()}
                            </p>
                            <p className='font-mono text-[11px] text-white/40 tracking-[2px] mt-1.5'>
                                {isLevelUp ? 'RANK UP!' : 'WORKOUT COMPLETE'}
                            </p>
                        </motion.div>

                        {/* XP Earned */}
                        {xpTotal != null && (
                            <motion.div
                                className='flex justify-center mt-5'
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                            >
                                <span className='font-bebas text-[44px] leading-none text-orange-400 tracking-[2px]'>
                                    +{xpTotal} XP
                                </span>
                            </motion.div>
                        )}

                        {/* XP Progress Bar */}
                        <div className='mt-5 animate-slideUp' style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
                            <div className='flex justify-between items-baseline mb-1.5'>
                                <span className='font-mono text-[10px] text-white/35 tracking-[1.5px]'>XP PROGRESS</span>
                                <span className='font-mono text-[11px] text-white/50'>
                                    {currentXp.toLocaleString()} / {nextThreshold != null ? nextThreshold.toLocaleString() : 'MAX'}
                                </span>
                            </div>
                            <div className='h-3 rounded-full bg-white/[0.07] overflow-hidden'>
                                <motion.div
                                    className='h-full rounded-full'
                                    style={{ background: rank.color, boxShadow: `0 0 14px ${rank.color}55` }}
                                    initial={{ width: `${Math.round(prevFraction * 100)}%` }}
                                    animate={{ width: `${Math.round(totalFraction * 100)}%` }}
                                    transition={{ delay: 0.35, duration: 0.8, ease: 'easeOut' }}
                                />
                            </div>
                            {!isMaxRank && (
                                <p className='font-mono text-[11px] text-white/40 mt-2 text-center'>
                                    <span className='text-orange-400 font-medium'>{xpRemaining.toLocaleString()} XP</span> to {nextRank?.name?.toUpperCase()}
                                </p>
                            )}
                            {isMaxRank && (
                                <p className='font-mono text-[11px] text-white/30 mt-2 text-center'>
                                    Maximum rank reached
                                </p>
                            )}
                        </div>

                        {/* Rank Journey */}
                        <div className='mt-5 animate-slideUp' style={{ animationDelay: '0.22s', animationFillMode: 'both' }}>
                            <div className='flex items-center justify-center gap-2'>
                                {prevRank && (
                                    <>
                                        <span className='font-mono text-[10px] text-white/25 tracking-wider'>{prevRank.name.toUpperCase()}</span>
                                        <ChevronRight size={12} className='text-white/15' />
                                    </>
                                )}
                                <span className='font-bebas text-[15px] tracking-[2px]' style={{ color: rank.color }}>
                                    {rank.name.toUpperCase()}
                                </span>
                                {nextRank && (
                                    <>
                                        <ChevronRight size={12} className='text-white/15' />
                                        <span className='font-mono text-[10px] text-white/25 tracking-wider'>{nextRank.name.toUpperCase()}</span>
                                    </>
                                )}
                                {!nextRank && <span className='font-mono text-[10px] text-white/15 tracking-wider ml-1'>MAX</span>}
                            </div>
                        </div>

                        {/* Challenges */}
                        {groups.length > 0 && (
                            <div className='mt-6 animate-slideUp' style={{ animationDelay: '0.29s', animationFillMode: 'both' }}>
                                <div className='flex items-center justify-between mb-2.5'>
                                    <p className='font-mono text-[10px] tracking-[2px] text-white/35'>RANK CHALLENGES</p>
                                    <p className='font-mono text-[10px] text-orange-400/80'>{doneCount}/{groups.length}</p>
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                    {groups.map((ch) => (
                                        <div key={ch.key} className='flex items-center gap-2.5 py-1'>
                                            {ch.done ? (
                                                <CheckCircle2 size={15} className='text-emerald-400 shrink-0' />
                                            ) : (
                                                <Circle size={15} className='text-white/20 shrink-0' />
                                            )}
                                            <span className={`font-mono text-[11px] leading-tight flex-1 ${ch.done ? 'text-white/30 line-through' : 'text-white/60'}`}>
                                                {ch.label}
                                            </span>
                                            <span className='font-mono text-[9px] text-white/25 shrink-0'>{challengeTarget(ch)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Session Rewards */}
                        <div className='mt-6 animate-slideUp' style={{ animationDelay: '0.36s', animationFillMode: 'both' }}>
                            <p className='font-mono text-[10px] tracking-[2px] text-white/35 mb-2.5'>SESSION REWARDS</p>
                            <div className='flex flex-col gap-1.5'>
                                <div className='flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2'>
                                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10'>
                                        <Plus size={14} className='text-orange-400' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='font-mono text-[10px] text-orange-400 tracking-wider'>+{breakdown?.base ?? 20} XP</p>
                                        <p className='font-mono text-[10px] text-white/50'>WORKOUT BASE</p>
                                    </div>
                                </div>
                                {groupBonusesByExercise(breakdown?.bonuses).map(([name, bonuses], i) => (
                                    <ExerciseGroup key={i} name={name} bonuses={bonuses} />
                                ))}
                            </div>
                        </div>

                        {/* Next Target */}
                        {!isMaxRank && (
                            <div
                                className='mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center animate-slideUp'
                                style={{ animationDelay: '0.50s', animationFillMode: 'both' }}
                            >
                                <p className='font-mono text-[9px] tracking-[2px] text-white/25 mb-1.5'>NEXT TARGET</p>
                                <p className='font-bebas text-[17px] tracking-[2px]' style={{ color: nextRank?.color || rank.color }}>
                                    {nextRank?.name?.toUpperCase()}
                                </p>
                                <p className='font-mono text-[10px] text-white/35 mt-0.5'>
                                    {xpRemaining.toLocaleString()} XP remaining
                                </p>
                            </div>
                        )}
                    </div>

                    {/* CTA */}
                    <div className='px-5 pb-5 pt-3'>
                        <button
                            onClick={onClose}
                            className='w-full border rounded-2xl py-3 font-bebas tracking-[3px] text-[17px] cursor-pointer hover:opacity-80 transition-opacity'
                            style={{ borderColor: rank.color + '50', color: rank.color }}
                        >
                            {isLevelUp ? 'CONTINUE JOURNEY' : 'CONTINUE'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
