import { Medal } from 'lucide-react'

export default function PrsBadge() {
    return (
        <div className='flex items-center gap-2'>
            <div className='border border-orange-500/50 rounded-full w-7 h-7 flex items-center justify-center'>
                <Medal size={16} className='text-orange-500' />
            </div>
            <p className='font-inter text-white/40 tracking-[1px] text-[10px]'>PRs</p>
        </div>
    )
}