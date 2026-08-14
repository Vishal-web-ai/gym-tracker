import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Zap, Flame, Timer } from 'lucide-react'
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

export default function LevelUpOverlay({ rank, breakdown = null, isLevelUp = false, onClose }) {
    const bonusCount = breakdown?.bonuses?.length || 0
    const headline = isLevelUp ? 'RANK UP!' : 'WORKOUT COMPLETE'
    const xpTotal = breakdown ? breakdown.xp : null

    return (
        <AnimatePresence>
            <motion.div
                className='fixed inset-0 z-[80] flex items-center justify-center px-6 bg-black/70'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
            >
                {isLevelUp && CONFETTI.map((c) => (
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
                    className='relative w-full max-w-[340px] border rounded-3xl p-6 flex flex-col items-center gap-4'
                    style={{ borderColor: rank.color, background: 'rgba(10,10,10,0.97)', boxShadow: `0 0 40px ${rank.color}66` }}
                    initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                >
                    <button
                        onClick={onClose}
                        className='absolute top-3 right-3 text-white/40 hover:text-white cursor-pointer'
                        aria-label='Close'
                    >
                        <X size={20} />
                    </button>

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.25, 1] }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                    >
                        <RankIcon rank={rank} size={88} />
                    </motion.div>

                    <p className='font-bebas tracking-[4px] text-3xl' style={{ color: rank.color }}>
                        {headline}
                    </p>

                    {isLevelUp ? (
                        <div className='text-center'>
                            <p className='font-bebas tracking-[2px] text-2xl text-white'>{rank.name.toUpperCase()}</p>
                            <p className='font-mono text-white/50 text-xs mt-1'>LEVEL {rank.level}</p>
                        </div>
                    ) : xpTotal != null ? (
                        <div className='text-center'>
                            <p className='font-bebas tracking-[2px] text-2xl text-white'>+{xpTotal} XP</p>
                            <p className='font-mono text-white/50 text-xs mt-1'>
                                {breakdown.base} base{bonusCount ? ` + ${bonusCount} bonus${bonusCount > 1 ? 'es' : ''}` : ''}
                            </p>
                        </div>
                    ) : null}

                    {bonusCount > 0 && (
                        <div className='flex flex-col gap-1.5 w-full'>
                            <p className='font-mono text-white/40 text-[10px] tracking-[2px] text-center'>BONUSES EARNED</p>
                            <div className='flex flex-wrap justify-center gap-1.5'>
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
            </motion.div>
        </AnimatePresence>
    )
}
