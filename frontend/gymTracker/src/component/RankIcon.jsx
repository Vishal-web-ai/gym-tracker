import { Medal } from 'lucide-react'

export default function RankIcon({ rank, size = 14, unlocked = true }) {
    if (rank.icon) {
        return (
            <img
                src={rank.icon}
                alt=''
                draggable={false}
                className='shrink-0 rounded-full'
                style={{
                    width: size,
                    height: size,
                    filter: unlocked ? 'none' : 'grayscale(1) opacity(0.35)'
                }}
            />
        )
    }
    return <Medal size={size} color={unlocked ? rank.color : '#3f3f46'} fill={unlocked ? rank.color : 'none'} />
}
