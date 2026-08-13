import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { readMediaFile } from '../services/media'

function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ExerciseMedia({ media = [], onDelete }) {
    const [viewerIndex, setViewerIndex] = useState(null)
    const [currentUrl, setCurrentUrl] = useState(null)

    const closeViewer = useCallback(() => {
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        setCurrentUrl(null)
        setViewerIndex(null)
    }, [currentUrl])

    const loadIndex = useCallback(async (idx) => {
        if (idx < 0 || idx >= media.length) return
        const item = media[idx]
        try {
            const file = await readMediaFile(item.id)
            const url = URL.createObjectURL(file)
            setCurrentUrl(prev => {
                if (prev) URL.revokeObjectURL(prev)
                return url
            })
            setViewerIndex(idx)
        } catch {
            alert('This photo/video could not be opened.')
        }
    }, [media])

    useEffect(() => {
        if (viewerIndex === null) return
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft' && viewerIndex > 0) {
                loadIndex(viewerIndex - 1)
            } else if (e.key === 'ArrowRight' && viewerIndex < media.length - 1) {
                loadIndex(viewerIndex + 1)
            } else if (e.key === 'Escape') {
                closeViewer()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [viewerIndex, media.length, loadIndex, closeViewer])

    if (!media || media.length === 0) return null

    const activeItem = viewerIndex !== null ? media[viewerIndex] : null

    const handlePrev = (e) => {
        e?.stopPropagation()
        if (viewerIndex > 0) loadIndex(viewerIndex - 1)
    }

    const handleNext = (e) => {
        e?.stopPropagation()
        if (viewerIndex < media.length - 1) loadIndex(viewerIndex + 1)
    }

    const handleDelete = (e) => {
        e?.stopPropagation()
        if (viewerIndex === null || !onDelete) return
        const item = media[viewerIndex]
        if (!confirm(`Delete "${item.fileName || 'file'}"?`)) return
        const newIndex = viewerIndex >= media.length - 1 ? viewerIndex - 1 : viewerIndex
        onDelete(viewerIndex)
        if (media.length <= 1) {
            closeViewer()
        } else if (newIndex >= 0) {
            loadIndex(newIndex)
        } else {
            closeViewer()
        }
    }

    return (
        <div className='flex items-center justify-end' style={{ marginTop: '-2.6em', marginRight: '3px' }}>
            <button
                onClick={() => loadIndex(0)}
                className='flex items-center gap-0.5 px-1.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer bg-orange-500/10 border border-orange-500/40 text-orange-400 hover:bg-orange-500/20'
                title='View media'
            >
                <ImageIcon size={14} />
                Media ({media.length})
            </button>

            {viewerIndex !== null && activeItem && (
                <div
                    className='fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 select-none'
                    onClick={closeViewer}
                >
                    <div className='absolute top-4 right-4 z-10'>
                        <X className='text-white cursor-pointer hover:text-orange-400 transition-all' size={32} onClick={closeViewer} />
                    </div>

                    {onDelete && (
                        <div className='absolute top-4 left-4 z-10'>
                            <button
                                onClick={handleDelete}
                                className='flex items-center gap-1.5 bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black p-2 rounded-lg transition-all cursor-pointer'
                                title='Delete media'
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}

                    <p className='absolute top-5 left-1/2 -translate-x-1/2 text-white/70 font-mono text-sm z-10'>
                        {viewerIndex + 1} / {media.length}
                    </p>

                    <motion.div
                        key={viewerIndex}
                        drag='x'
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, info) => {
                            if (info.offset.x < -50 || info.velocity.x < -300) {
                                if (viewerIndex < media.length - 1) loadIndex(viewerIndex + 1)
                            } else if (info.offset.x > 50 || info.velocity.x > 300) {
                                if (viewerIndex > 0) loadIndex(viewerIndex - 1)
                            }
                        }}
                        className='relative max-w-full max-h-[80vh] flex items-center justify-center cursor-grab active:cursor-grabbing'
                        onClick={(e) => e.stopPropagation()}
                    >
                        {activeItem.type === 'video' ? (
                            <video
                                src={currentUrl}
                                controls
                                autoPlay
                                className='max-w-full max-h-[80vh] rounded-lg'
                            />
                        ) : (
                            <img
                                src={currentUrl}
                                alt={activeItem.fileName}
                                className='max-w-full max-h-[80vh] rounded-lg object-contain pointer-events-none'
                            />
                        )}
                    </motion.div>

                    {media.length > 1 && (
                        <>
                            {viewerIndex > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className='absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-orange-500/20 p-3 text-white cursor-pointer hover:bg-orange-500/40 transition-all z-10'
                                    title='Previous'
                                >
                                    <ChevronLeft size={28} />
                                </button>
                            )}
                            {viewerIndex < media.length - 1 && (
                                <button
                                    onClick={handleNext}
                                    className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-orange-500/20 p-3 text-white cursor-pointer hover:bg-orange-500/40 transition-all z-10'
                                    title='Next'
                                >
                                    <ChevronRight size={28} />
                                </button>
                            )}
                        </>
                    )}

                    <p className='absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 font-mono text-sm whitespace-nowrap z-10'>
                        {activeItem.fileName} {activeItem.createdAt ? `· ${formatDate(activeItem.createdAt)}` : ''}
                    </p>
                </div>
            )}
        </div>
    )
}
