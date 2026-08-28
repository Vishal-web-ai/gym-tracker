import RankIcon from './RankIcon'

export default function RankBadge({ rank, compact = false }) {
    if (!rank) return null
    if (compact) {
        return (
            <div className='flex items-center gap-1.5'>
                <RankIcon rank={rank} size={20} />
                <p className='font-bebas tracking-[1px] leading-none' style={{ color: rank.color, fontSize: 10 }}>
                    {rank.name.toUpperCase()}
                </p>
                <p className='font-mono font-bold text-orange-500 text-[10px] leading-none ml-auto'>{rank.xp} XP</p>
            </div>
        )
    }
    const nextLabel = rank.nextThreshold ? `NEXT LV.${rank.level + 1}` : 'MAX RANK'
    const fill = rank.nextThreshold ? Math.min(rank.xp / rank.nextThreshold, 1) : 1
    return (
        <div className='flex flex-col gap-1 w-full'>
            <div className='flex items-center gap-2'>
                <RankIcon rank={rank} size={28} />
                <p className='font-bebas tracking-[2px] leading-none' style={{ color: rank.color, fontSize: 14 }}>
                    {rank.name.toUpperCase()}
                </p>
                <p className='font-mono text-white/50 text-[10px] leading-none ml-auto'>
                    LV.{rank.level} · {rank.xp} XP
                </p>
            </div>
            <div className='flex items-center gap-2'>
                <div className='flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden'>
                    <div
                        className='h-full rounded-full transition-all duration-500'
                        style={{ width: `${Math.round(fill * 100)}%`, background: rank.color }}
                    />
                </div>
                <p className='font-mono text-white/40 text-[8px] leading-none shrink-0'>{nextLabel}</p>
            </div>
        </div>
    )
}
