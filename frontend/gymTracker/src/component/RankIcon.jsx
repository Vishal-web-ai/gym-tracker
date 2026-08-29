import { Medal } from 'lucide-react'

export default function RankIcon({ rank, size = 14, unlocked = true }) {
    if (rank.icon) {
        const landscape = rank.landscape
        const h = landscape ? Math.round(size * 1.1) : size
        const w = landscape ? Math.round(h * 1.5) : size
        return (
            <img
                src={rank.icon}
                alt=''
                draggable={false}
                className={`shrink-0 object-contain ${landscape ? 'rounded-xl' : 'rounded-full'}`}
                style={{
                    width: w,
                    height: h,
                    filter: unlocked ? 'none' : 'grayscale(1) opacity(0.35)'
                }}
            />
        )
    }
    return <Medal size={size} color={unlocked ? rank.color : '#3f3f46'} fill={unlocked ? rank.color : 'none'} />
}
