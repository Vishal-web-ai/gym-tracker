import { motion } from 'framer-motion'
import { Dumbbell } from 'lucide-react'
import { useDevice } from './DeviceContext'

export default function FloatingDumbbell({
    size = 40,
    initialX = 0,
    initialY = 0,
    travel = 30,
    duration = 6,
    delay = 0,
    rotate = 40,
    direction = 1,
    opacity = 0.15
}) {
    const { config } = useDevice()
    return (
        <motion.div
            className='absolute pointer-events-none'
            style={{ left: initialX, top: initialY }}
            initial={{ y: 0, rotate: 0 }}
            animate={config.infiniteMotion ? { y: [0, travel * direction, 0], rotate: [0, rotate * direction, 0] } : undefined}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
            <Dumbbell size={size} color='#f97316' style={{ opacity }} />
        </motion.div>
    )
}
