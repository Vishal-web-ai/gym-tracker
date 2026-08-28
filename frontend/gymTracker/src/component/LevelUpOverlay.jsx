import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Circle } from 'lucide-react'
import RankIcon from './RankIcon'
import { RANKS } from '../services/progression'
import { buzzStrong } from '../services/haptics'

const challengeTarget = (ch) => {
    if (ch.kind === 'weight') return `${ch.value}kg`
    if (ch.kind === 'reps') return `${ch.value} reps`
    return `${ch.value}min`
}

const stagger = (i) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.15 + i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } })

export default function LevelUpOverlay({ rank, breakdown = null, isLevelUp = false, progress = null, onClose }) {
    const xpTotal = breakdown?.xp ?? null
    const groups = progress?.challenges?.[rank.level - 1]?.groups || []
    const doneCount = groups.filter((g) => g.done).length
    const nextThreshold = progress?.rank?.nextThreshold
    const currentXp = progress?.xp ?? 0
    const totalFraction = nextThreshold != null ? Math.min(currentXp / nextThreshold, 1) : 1
    const xpRemaining = nextThreshold != null ? Math.max(0, nextThreshold - currentXp) : 0
    const isMaxRank = nextThreshold == null
    const nextRank = rank.level < RANKS.length ? RANKS[rank.level] : null

    useEffect(() => {
        if (isLevelUp) buzzStrong()
    }, [isLevelUp])

    return (
        <AnimatePresence>
            <motion.div
                className='fixed inset-0 z-[80] flex items-center justify-center bg-black/60'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
            >
                <motion.div
                    key='card'
                    className='relative w-full h-full max-w-[400px] max-h-[90vh] border rounded-3xl flex flex-col overflow-hidden'
                    style={{ borderColor: rank.color + '30', background: 'rgba(10,10,10,0.98)', boxShadow: `0 0 60px ${rank.color}18` }}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    onClick={(e) => e.stopPropagation()}
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
                            transition={{ delay: 0.15, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                            <div className='relative mb-3'>
                                <div
                                    className='absolute inset-[-20px] rounded-full opacity-40 blur-2xl'
                                    style={{ background: `radial-gradient(circle, ${rank.color}, transparent 70%)` }}
                                />
                                <div
                                    className='absolute inset-[-10px] rounded-full opacity-20 blur-xl'
                                    style={{ background: rank.color }}
                                />
                                <RankIcon rank={rank} size={120} />
                            </div>

                            <p className='font-bebas text-[32px] leading-none tracking-[3px]' style={{ color: rank.color }}>
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
                                {...stagger(1)}
                            >
                                <span className='font-bebas text-[48px] leading-none text-orange-400 tracking-[2px]'>
                                    +{xpTotal} XP
                                </span>
                            </motion.div>
                        )}

                        {/* XP Progress Bar */}
                        <motion.div className='mt-5' {...stagger(2)}>
                            <div className='flex justify-between items-baseline mb-1.5'>
                                <span className='font-mono text-[10px] text-white/35 tracking-[1.5px]'>XP PROGRESS</span>
                                <span className='font-mono text-[11px] text-white/50'>
                                    {currentXp.toLocaleString()} / {nextThreshold != null ? nextThreshold.toLocaleString() : 'MAX'}
                                </span>
                            </div>
                            <div className='relative h-4 rounded-full bg-white/[0.07] overflow-hidden'>
                                <motion.div
                                    className='absolute inset-0 rounded-full opacity-30 blur-sm'
                                    style={{ background: rank.color }}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${Math.round(totalFraction * 100)}%` }}
                                    transition={{ delay: 0.6, duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                                />
                                <motion.div
                                    className='absolute inset-0 h-full rounded-full'
                                    style={{
                                        background: `linear-gradient(90deg, ${rank.color}cc, ${rank.color})`,
                                        boxShadow: `0 0 18px ${rank.color}66, inset 0 1px 0 rgba(255,255,255,0.15)`
                                    }}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${Math.round(totalFraction * 100)}%` }}
                                    transition={{ delay: 0.6, duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                                />
                                <motion.div
                                    className='absolute top-0 left-0 h-full w-12 rounded-full'
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                    }}
                                    initial={{ left: '0%' }}
                                    animate={{ left: `${Math.round(totalFraction * 100)}%` }}
                                    transition={{ delay: 2.0, duration: 0.6, ease: 'easeOut' }}
                                />
                            </div>
                            {!isMaxRank && (
                                <motion.p
                                    className='font-mono text-[11px] text-white/40 mt-2 text-center'
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.8, duration: 0.4 }}
                                >
                                    <span className='text-orange-400 font-medium'>{xpRemaining.toLocaleString()} XP</span> to {nextRank?.name?.toUpperCase()}
                                </motion.p>
                            )}
                            {isMaxRank && (
                                <p className='font-mono text-[11px] text-white/30 mt-2 text-center'>
                                    Maximum rank reached
                                </p>
                            )}
                        </motion.div>

                        {/* Challenges */}
                        {groups.length > 0 && (
                            <motion.div className='mt-6' {...stagger(3)}>
                                <div className='flex items-center justify-between mb-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-2.5'>
                                    <p className='font-bebas text-[16px] tracking-[2px] text-white/70'>RANK CHALLENGES</p>
                                    <p className='font-bebas text-[22px] text-orange-400'>{doneCount}<span className='text-white/30'>/{groups.length}</span></p>
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
                            </motion.div>
                        )}

                        {/* Next Target */}
                        {!isMaxRank && (
                            <motion.div
                                className='mt-5 rounded-xl border p-4 text-center'
                                style={{ borderColor: (nextRank?.color || rank.color) + '25', background: `linear-gradient(180deg, ${(nextRank?.color || rank.color)}08, transparent)` }}
                                {...stagger(4)}
                            >
                                <p className='font-mono text-[10px] tracking-[2px] text-white/40 mb-1.5'>NEXT TARGET</p>
                                <p className='font-bebas text-[24px] tracking-[3px]' style={{ color: nextRank?.color || rank.color }}>
                                    {nextRank?.name?.toUpperCase()}
                                </p>
                                <p className='font-mono text-[12px] text-white/50 mt-1'>
                                    <span className='text-orange-400 font-bold'>{xpRemaining.toLocaleString()} XP</span> remaining
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* CTA */}
                    <div className='px-5 pb-5 pt-3'>
                        <button
                            onClick={onClose}
                            className='w-full border rounded-2xl py-3.5 font-bebas tracking-[3px] text-[17px] cursor-pointer hover:opacity-80 transition-opacity'
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
