import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Play, Image as ImageIcon } from 'lucide-react'
import { getMediaPage, deleteMedia, readMediaFile, cleanupOrphans } from '../services/media'
import { getErrorMessage } from '../services/errors'

const PAGE_SIZE = 30

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaGallery({ onClose }) {
    const [items, setItems] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [error, setError] = useState('')
    const [viewer, setViewer] = useState(null)
    const sentinelRef = useRef(null)
    const viewerUrlRef = useRef(null)
    const mountedRef = useRef(true)
    const loadIdRef = useRef(0)

    const typeArg = filter === 'all' ? null : filter

    const loadFirstPage = () => {
        const id = ++loadIdRef.current
        getMediaPage(PAGE_SIZE, null, typeArg)
            .then(page => {
                if (!mountedRef.current || id !== loadIdRef.current) return
                setItems(page)
                setHasMore(page.length === PAGE_SIZE)
            })
            .catch(err => {
                if (mountedRef.current && id === loadIdRef.current) setError(getErrorMessage(err))
            })
            .finally(() => {
                if (mountedRef.current && id === loadIdRef.current) setLoading(false)
            })
    }

    const changeFilter = (key) => {
        if (key === filter) return
        loadIdRef.current += 1
        setError('')
        setLoading(true)
        setFilter(key)
    }

    const loadNextPage = async () => {
        if (loadingMore || !hasMore || loading) return
        setLoadingMore(true)
        try {
            const last = items[items.length - 1]
            const page = await getMediaPage(PAGE_SIZE, last, typeArg)
            if (!mountedRef.current) return
            setItems(prev => [...prev, ...page])
            setHasMore(page.length === PAGE_SIZE)
        } catch (err) {
            if (mountedRef.current) setError(getErrorMessage(err))
        } finally {
            if (mountedRef.current) setLoadingMore(false)
        }
    }

    useEffect(() => {
        mountedRef.current = true
        cleanupOrphans().catch(() => {})
        loadFirstPage()
        return () => {
            mountedRef.current = false
            if (viewerUrlRef.current) {
                URL.revokeObjectURL(viewerUrlRef.current)
                viewerUrlRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                loadNextPage()
            }
        }, { rootMargin: '400px' })
        observer.observe(sentinel)
        return () => observer.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, loading, hasMore])

    const handleDelete = async (item) => {
        if (!confirm(`Delete "${item.fileName}"? This cannot be undone.`)) return
        try {
            await deleteMedia(item.id)
            setItems(prev => prev.filter(i => i.id !== item.id))
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    const openViewer = async (item) => {
        setError('')
        try {
            const file = await readMediaFile(item.id)
            if (!mountedRef.current) return
            const url = URL.createObjectURL(file)
            if (viewerUrlRef.current) {
                URL.revokeObjectURL(viewerUrlRef.current)
            }
            viewerUrlRef.current = url
            setViewer({ item, url })
        } catch {
            setError('This memory could not be opened. It may have been removed or corrupted.')
        }
    }

    const closeViewer = () => {
        if (viewerUrlRef.current) {
            URL.revokeObjectURL(viewerUrlRef.current)
            viewerUrlRef.current = null
        }
        setViewer(null)
    }

    const formatDate = (iso) => {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        })
    }

    return (
        <div className='fixed inset-0 bg-neutral-900 z-50 flex flex-col'>
            <div className='flex items-center justify-between px-5 h-16 border-b border-neutral-700 shrink-0'>
                <h1 className='text-white text-xl font-bold font-mono'>Gym Memories</h1>
                <X
                    onClick={onClose}
                    className='text-white cursor-pointer hover:opacity-70'
                    size={28}
                />
            </div>

            <div className='px-4 pt-3 pb-1 shrink-0 flex gap-2'>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'image', label: 'Photos' },
                    { key: 'video', label: 'Videos' }
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => changeFilter(t.key)}
                        className={`flex-1 py-2 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer ${
                            filter === t.key
                                ? 'bg-orange-500 text-black'
                                : 'bg-neutral-800 border border-neutral-700 text-white/60 hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className='flex-1 overflow-y-auto p-4 scroll'>
                {error && (
                    <p className='text-red-400 font-mono text-sm mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3'>
                        {error}
                    </p>
                )}
                {loading ? (
                    <p className='text-orange-500/50 text-center font-mono py-10'>Loading...</p>
                ) : items.length === 0 ? (
                    <p className='text-orange-500/50 text-center font-mono py-10 mt-6 tracking-wide'>
                        {filter === 'image'
                            ? 'No photos yet.'
                            : filter === 'video'
                                ? 'No videos yet.'
                                : 'No memories yet.'}
                        <br />
                        Media saved from your workouts appears here.
                    </p>
                ) : (
                    <>
                        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className='relative aspect-square rounded-xl overflow-hidden border border-orange-500/30 group'
                                >
                                    {item.thumb ? (
                                        <img
                                            src={item.thumb}
                                            alt={item.fileName}
                                            loading='lazy'
                                            className='w-full h-full object-cover cursor-pointer'
                                            onClick={() => openViewer(item)}
                                        />
                                    ) : (
                                        <div
                                            className='w-full h-full bg-neutral-800 flex items-center justify-center cursor-pointer'
                                            onClick={() => openViewer(item)}
                                        >
                                            {item.type === 'video' ? (
                                                <Play className='text-orange-500' size={40} />
                                            ) : (
                                                <ImageIcon className='text-orange-500' size={40} />
                                            )}
                                        </div>
                                    )}
                                    {item.type === 'video' && (
                                        <div className='absolute top-2 right-2 bg-black/60 rounded-full p-1.5 pointer-events-none'>
                                            <Play className='text-orange-500' size={16} fill='currentColor' />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className='absolute bottom-2 right-2 bg-black/70 text-red-400 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                                        title='Delete'
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <p className='absolute bottom-2 left-2 bg-black/70 text-white/80 font-mono text-[11px] px-2 py-0.5 rounded-md pointer-events-none'>
                                        {formatDate(item.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {hasMore && (
                            <div ref={sentinelRef} className='py-6 text-center'>
                                {loadingMore && (
                                    <p className='text-orange-500/50 font-mono text-sm'>Loading more...</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {viewer && (
                <div
                    className='fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4'
                    onClick={closeViewer}
                >
                    <div className='absolute top-4 right-4'>
                        <X className='text-white cursor-pointer' size={32} onClick={closeViewer} />
                    </div>
                    {viewer.item.type === 'video' ? (
                        <video
                            src={viewer.url}
                            controls
                            autoPlay
                            className='max-w-full max-h-[80vh] rounded-lg'
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <img
                            src={viewer.url}
                            alt={viewer.item.fileName}
                            className='max-w-full max-h-[80vh] rounded-lg object-contain'
                            onClick={e => e.stopPropagation()}
                        />
                    )}
                    <p className='absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 font-mono text-sm'>
                        {viewer.item.fileName} · {formatSize(viewer.item.size)} · {formatDate(viewer.item.createdAt)}
                    </p>
                </div>
            )}
        </div>
    )
}
