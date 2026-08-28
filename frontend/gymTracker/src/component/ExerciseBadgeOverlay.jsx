import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useDevice } from './DeviceContext'
import { buzzStrong } from '../services/haptics'

const CONFETTI_COLORS = ['#f97316', '#facc15', '#34d399', '#38bdf8', '#a855f7', '#f43f5e']

function confettiPieces(count) {
    return Array.from({ length: count }, (_, i) => {
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

function Confetti() {
    const { config } = useDevice()
    const pieces = confettiPieces(config.confettiCount)

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

function parseHex(hex) {
    const h = hex.replace('#', '')
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16)
    }
}

function toRgb(r, g, b) {
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
}

function extrudedTextShadow(faceColor, layers = 14, depthPx = 14) {
    const face = parseHex(faceColor)
    const step = depthPx / layers
    const shadows = []
    for (let i = 1; i <= layers; i++) {
        const t = i / layers
        const r = face.r * (1 - t * 0.65)
        const g = face.g * (1 - t * 0.65)
        const b = face.b * (1 - t * 0.65)
        shadows.push(`${(i * step).toFixed(1)}px ${(i * step).toFixed(1)}px 0 ${toRgb(r, g, b)}`)
    }
    shadows.push(`${depthPx + 3}px ${depthPx + 5}px 12px rgba(0,0,0,0.45)`)
    return shadows.join(', ')
}

export default function ExerciseBadgeOverlay({ exerciseName, level, color, onClose }) {
    const [show, setShow] = useState(false)
    useEffect(() => {
        buzzStrong()
        const t = setTimeout(() => setShow(true), 50)
        return () => clearTimeout(t)
    }, [])

    const levelText = `LEVEL ${level}`
    const shadow = extrudedTextShadow(color, 14, 14)

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
                    <Confetti />

                    <motion.div
                        className='relative z-10 flex flex-col items-center text-center px-8'
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Metallic badge container */}
                        <motion.div
                            className='relative'
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.3 }}
                        >
                            {/* Outer glow ring */}
                            <div
                                className='absolute -inset-3 rounded-full opacity-40 blur-xl'
                                style={{ background: `radial-gradient(circle, ${color}66, transparent 70%)` }}
                            />

                            {/* Badge body — metallic circle */}
                            <div
                                className='relative w-[120px] h-[120px] rounded-full flex items-center justify-center'
                                style={{
                                    background: `linear-gradient(145deg, ${color}22 0%, ${color}11 40%, #1a1a1a 60%, ${color}18 100%)`,
                                    boxShadow: [
                                        `0 0 0 2px ${color}44`,
                                        `0 0 0 4px ${color}22`,
                                        `0 0 0 6px rgba(0,0,0,0.5)`,
                                        `inset 0 2px 4px rgba(255,255,255,0.15)`,
                                        `inset 0 -3px 6px rgba(0,0,0,0.6)`,
                                        `0 8px 24px rgba(0,0,0,0.5)`,
                                        `0 2px 8px ${color}33`
                                    ].join(', ')
                                }}
                            >
                                {/* Top highlight arc — metallic sheen */}
                                <div
                                    className='absolute top-[6px] left-[15%] right-[15%] h-[35%] rounded-full pointer-events-none'
                                    style={{
                                        background: `linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)`,
                                        borderRadius: '50%'
                                    }}
                                />

                                {/* Bottom shadow arc — depth */}
                                <div
                                    className='absolute bottom-[8px] left-[10%] right-[10%] h-[30%] rounded-full pointer-events-none'
                                    style={{
                                        background: `linear-gradient(0deg, rgba(0,0,0,0.35) 0%, transparent 100%)`,
                                        borderRadius: '50%'
                                    }}
                                />

                                {/* Shine sweep animation */}
                                <motion.div
                                    className='absolute inset-0 rounded-full pointer-events-none overflow-hidden'
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    <motion.div
                                        className='absolute top-0 h-full w-[40%] -skew-x-12'
                                        style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                                            left: '-40%'
                                        }}
                                        animate={{ left: ['-40%', '140%'] }}
                                        transition={{ duration: 1.5, delay: 1.0, ease: 'easeInOut' }}
                                    />
                                </motion.div>

                                {/* Trophy icon */}
                                <Trophy size={52} color={color} fill={color + '44'} strokeWidth={1.5} />
                            </div>
                        </motion.div>

                        {/* Exercise name — styled badge label */}
                        <motion.div
                            className='relative mt-6 px-5 py-1.5 rounded-full'
                            style={{
                                background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                                boxShadow: `0 0 0 3px ${color}55, inset 0 1px 0 rgba(255,255,255,0.06)`
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <p
                                className='font-bebas text-[20px] font-black tracking-[6px] leading-none'
                                style={{ color }}
                            >
                                {exerciseName.toUpperCase()}
                            </p>
                        </motion.div>

                        {/* Extruded 3D LEVEL text — stacked text-shadow, font-black */}
                        <motion.div
                            className='relative mt-3'
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 160, delay: 0.6 }}
                        >
                            <p
                                className='font-bebas text-[64px] font-black leading-none tracking-[4px]'
                                style={{
                                    color,
                                    textShadow: shadow
                                }}
                            >
                                {levelText}
                            </p>
                        </motion.div>

                        <motion.p
                            className='font-mono text-[10px] text-white/30 tracking-[2px] mt-4'
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
