import { useState, useEffect } from 'react'
import { RiCloseLine, RiImageLine, RiFileHistoryLine, RiSettingsLine } from '@remixicon/react'
import MediaGallery from './MediaGallery'
import WorkoutHistory from './WorkoutHistory'
import Settings from './Settings'
import { getUserProfile } from '../services/storage'

const Humberger = ({ isOpen, onClose, name, onNameChange, onScheduleSaved }) => {
    const [showGallery, setShowGallery] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [photoData, setPhotoData] = useState('')

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        getUserProfile()
            .then(profile => {
                if (!cancelled) setPhotoData(profile.photoData || '')
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [isOpen])

    return (
        <>
            {isOpen && (
                <div onClick={onClose} className='fixed inset-0 bg-neutral-900 z-40' />
            )}
            <div
                className={`fixed top-0 left-0 h-full w-full max-w-sm bg-neutral-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } flex flex-col`}
            >
                <div className='flex items-center justify-between px-5 h-20 border-b border-neutral-600'>
                    <div className='flex items-center gap-3'>
                        {photoData && (
                            <img
                                src={photoData}
                                alt='Profile'
                                className='rounded-full border border-orange-500/60 object-cover'
                                style={{ width: 40, height: 40 }}
                            />
                        )}
                        <h1 className='text-white text-2xl font-bold'>Menu</h1>
                    </div>
                    <RiCloseLine
                        color="white"
                        size={36}
                        className='cursor-pointer hover:opacity-70'
                        onClick={onClose}
                    />
                </div>
                <div className='flex-1 overflow-y-auto p-4 scroll flex flex-col gap-3'>
                    <button
                        onClick={() => setShowHistory(true)}
                        className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                    >
                        <RiFileHistoryLine size={20} />
                        Workout History
                    </button>
                    <button
                        onClick={() => setShowGallery(true)}
                        className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                    >
                        <RiImageLine size={20} />
                        Gym Memories
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                    >
                        <RiSettingsLine size={20} />
                        Settings
                    </button>
                </div>
            </div>

            {showGallery && <MediaGallery onClose={() => setShowGallery(false)} />}
            {showHistory && <WorkoutHistory onClose={() => setShowHistory(false)} />}
            {showSettings && (
                <Settings
                    onClose={() => setShowSettings(false)}
                    name={name}
                    onNameChange={onNameChange}
                    onScheduleSaved={onScheduleSaved}
                />
            )}
        </>
    )
}

export default Humberger
