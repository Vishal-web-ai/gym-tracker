import { Trophy } from 'lucide-react'

export default function PrsBadge() {
    return (
        <div className='flex items-center gap-2'>
            <Trophy size={26} className='text-orange-500' fill='#f97316' />
            <p className='font-inter text-white/40 tracking-[1px] text-[10px]'>PRs</p>
        </div>
    )
}
