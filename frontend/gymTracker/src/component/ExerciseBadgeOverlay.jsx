import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'

const CONFETTI_COLORS = ['#f97316', '#facc15', '#34d399', '#38bdf8', '#a855f7', '#f43f5e']

function confettiPieces() {
    return Array.from({ length: 40 }, (_, i) => {
        const seed = (i * 7919 + 104729) % 100000
        const r = (n) => ((seed * (n + 1) * 13) % 1000) / 1000
        return {
            id: i,
            x: r(0) * 100,
            delay: r(1) * 0.6,
            duration: 1.2 + r(2),
            size: 4 + r(3) * 6,
            rotation: r(4) * 360,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        }
    })
}

function Confetti({ color }) {
    const pieces = confettiPieces(color)

    return (
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
            {pieces.map((p) => (
                <motion.div
                    key={p.id}
                    className='absolute rounded-sm'
                    style={{
                        left: `${p.x}%`,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        top: -10,
                        rotate: p.rotation
                    }}
                    initial={{ y: -20, opacity: 1, rotate: p.rotation }}
                    animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.rotation + 720 }}
                    transition={{ delay: p.delay, duration: p.duration, ease: 'easeIn' }}
                />
            ))}
        </div>
    )
}

export default function ExerciseBadgeOverlay({ exerciseName, level, color, onClose }) {
    const [show, setShow] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setShow(true), 50)
        return () => clearTimeout(t)
    }, [])

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className='fixed inset-0 z-[85] flex items-center justify-center bg-black/80'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={onClose}
                >
                    <Confetti color={color} />

                    <motion.div
                        className='relative z-10 flex flex-col items-center text-center px-8'
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.3 }}
                        >
                            <Trophy size={56} color={color} fill={color + '33'} />
                        </motion.div>

                        <motion.p
                            className='font-mono text-[11px] text-white/40 tracking-[3px] mt-4'
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {exerciseName.toUpperCase()}
                        </motion.p>

                        <motion.p
                            className='font-bebas text-[64px] leading-none tracking-[4px] mt-1'
                            style={{ color }}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 160, delay: 0.6 }}
                        >
                            LEVEL {level}
                        </motion.p>

                        <motion.p
                            className='font-mono text-[10px] text-white/30 tracking-[2px] mt-3'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                        >
                            TAP ANYWHERE TO CONTINUE
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
