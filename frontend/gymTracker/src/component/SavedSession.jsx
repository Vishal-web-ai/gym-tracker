import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Pencil, StickyNote, X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { renameSession } from '../services/storage'
import { readMediaFile } from '../services/media'
import { getErrorMessage } from '../services/errors'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    if (/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}\s+\w+\s+\d{4}$/.test(dateStr)) return dateStr
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

const CARD_COLORS = [
    { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', hoverBorder: 'rgba(249,115,22,0.75)', hoverBg: 'rgba(249,115,22,0.18)', text: '#fb923c', dropdownBg: 'rgba(249,115,22,0.05)', dropdownBorder: 'rgba(249,115,22,0.12)', cardBg: 'rgba(249,115,22,0.07)', cardBorder: 'rgba(249,115,22,0.15)', cardHover: 'rgba(249,115,22,0.25)' },
    { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', hoverBorder: 'rgba(56,189,248,0.75)', hoverBg: 'rgba(56,189,248,0.18)', text: '#38bdf8', dropdownBg: 'rgba(56,189,248,0.05)', dropdownBorder: 'rgba(56,189,248,0.12)', cardBg: 'rgba(56,189,248,0.07)', cardBorder: 'rgba(56,189,248,0.15)', cardHover: 'rgba(56,189,248,0.25)' },
    { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', hoverBorder: 'rgba(52,211,153,0.75)', hoverBg: 'rgba(52,211,153,0.18)', text: '#34d399', dropdownBg: 'rgba(52,211,153,0.05)', dropdownBorder: 'rgba(52,211,153,0.12)', cardBg: 'rgba(52,211,153,0.07)', cardBorder: 'rgba(52,211,153,0.15)', cardHover: 'rgba(52,211,153,0.25)' },
    { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', hoverBorder: 'rgba(168,85,247,0.75)', hoverBg: 'rgba(168,85,247,0.18)', text: '#a855f7', dropdownBg: 'rgba(168,85,247,0.05)', dropdownBorder: 'rgba(168,85,247,0.12)', cardBg: 'rgba(168,85,247,0.07)', cardBorder: 'rgba(168,85,247,0.15)', cardHover: 'rgba(168,85,247,0.25)' },
    { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', hoverBorder: 'rgba(251,191,36,0.75)', hoverBg: 'rgba(251,191,36,0.18)', text: '#fbbf24', dropdownBg: 'rgba(251,191,36,0.05)', dropdownBorder: 'rgba(251,191,36,0.12)', cardBg: 'rgba(251,191,36,0.07)', cardBorder: 'rgba(251,191,36,0.15)', cardHover: 'rgba(251,191,36,0.25)' },
    { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.35)', hoverBorder: 'rgba(244,63,94,0.75)', hoverBg: 'rgba(244,63,94,0.18)', text: '#f43f5e', dropdownBg: 'rgba(244,63,94,0.05)', dropdownBorder: 'rgba(244,63,94,0.12)', cardBg: 'rgba(244,63,94,0.07)', cardBorder: 'rgba(244,63,94,0.15)', cardHover: 'rgba(244,63,94,0.25)' },
    { bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.35)', hoverBorder: 'rgba(232,121,249,0.75)', hoverBg: 'rgba(232,121,249,0.18)', text: '#e879f9', dropdownBg: 'rgba(232,121,249,0.05)', dropdownBorder: 'rgba(232,121,249,0.12)', cardBg: 'rgba(232,121,249,0.07)', cardBorder: 'rgba(232,121,249,0.15)', cardHover: 'rgba(232,121,249,0.25)' },
    { bg: 'rgba(253,224,71,0.12)', border: 'rgba(253,224,71,0.35)', hoverBorder: 'rgba(253,224,71,0.75)', hoverBg: 'rgba(253,224,71,0.18)', text: '#fde047', dropdownBg: 'rgba(253,224,71,0.05)', dropdownBorder: 'rgba(253,224,71,0.12)', cardBg: 'rgba(253,224,71,0.07)', cardBorder: 'rgba(253,224,71,0.15)', cardHover: 'rgba(253,224,71,0.25)' },
]

const SavedSession = ({ sessions, onDelete, onUpdate, onDeleteMedia }) => {
    const [expandedId, setExpandedId] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [saving, setSaving] = useState(false)
    const [notesPopup, setNotesPopup] = useState({ open: false, text: '' })
    const [viewer, setViewer] = useState(null)

    const startEditing = (session) => {
        setEditingId(session.id)
        setEditName(session.name || 'Workout')
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditName('')
    }

    const saveName = async () => {
        if (!editName.trim() || saving) return
        setSaving(true)
        try {
            const updated = await renameSession(editingId, editName.trim())
            if (updated && onUpdate) onUpdate(updated)
            setEditingId(null)
        } catch (err) {
            alert(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    const openViewer = (sessionId, exerciseIndex, items, index) => {
        loadViewerUrl(sessionId, exerciseIndex, items, index)
    }

    const loadViewerUrl = async (sessionId, exerciseIndex, items, index) => {
        try {
            const file = await readMediaFile(items[index].id)
            setViewer({ sessionId, exerciseIndex, items, index, url: URL.createObjectURL(file) })
        } catch {
            setViewer(null)
            alert('This photo/video could not be opened. It may have been removed.')
        }
    }

    const handleViewerDelete = async () => {
        if (!viewer || !onDeleteMedia) return
        const { sessionId, exerciseIndex, items, index } = viewer
        const item = items[index]
        if (!confirm(`Delete "${item.fileName}"? This cannot be undone.`)) return
        try {
            await onDeleteMedia(sessionId, exerciseIndex, item.id)
            if (viewer.url) URL.revokeObjectURL(viewer.url)
            if (items.length === 1) {
                setViewer(null)
            } else {
                const nextIndex = index === items.length - 1 ? index - 1 : index
                setViewer(null)
                loadViewerUrl(
                    sessionId,
                    exerciseIndex,
                    items.filter((_, i) => i !== index),
                    nextIndex
                )
            }
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const viewerPrevNext = (dir) => {
        const { sessionId, exerciseIndex, items, index, url } = viewer
        const next = index + dir
        if (next < 0 || next >= items.length) return
        if (url) URL.revokeObjectURL(url)
        loadViewerUrl(sessionId, exerciseIndex, items, next)
    }

    const closeViewer = () => {
        if (viewer?.url) URL.revokeObjectURL(viewer.url)
        setViewer(null)
    }

    const exercisesOf = (session) => Array.isArray(session.exercises) ? session.exercises : []

    const setLines = (ex) => {
        const sets = Array.isArray(ex.sets) ? ex.sets : []
        return sets
            .map((s) => {
                if (s && typeof s === 'object') {
                    const parts = []
                    if (s.weight && s.weight !== '—') parts.push(s.weight)
                    if (s.reps && s.reps !== '—') parts.push(s.reps)
                    return parts.filter(Boolean).join(' × ')
                }
                return s !== '—' ? s : ''
            })
            .filter(Boolean)
    }

    const setsText = (ex) => {
        const sets = Array.isArray(ex.sets) ? ex.sets : []
        if (!sets.length) return '—'
        if (typeof sets[0] === 'object') {
            return sets
                .map((s) => {
                    const parts = []
                    if (s.reps && s.reps !== '—') parts.push(s.reps)
                    if (s.weight && s.weight !== '—') parts.push(s.weight)
                    return parts.join(' × ')
                })
                .filter(Boolean)
                .join(' · ')
        }
        return sets.filter(s => s !== '—').join(' × ')
    }

    if (sessions.length === 0) {
        return (
            <p className='text-white/30 text-center mt-10 font-mono tracking-wide'>
                No saved sessions yet. Start a workout and hit Save!
            </p>
        )
    }

    return (
        <>
            {sessions.map((session, index) => {
                const color = CARD_COLORS[index % CARD_COLORS.length]
                return (
                <div key={session.id} className='mb-3'>
                    <div
                        onClick={() =>
                            setExpandedId(expandedId === session.id ? null : session.id)
                        }
                        style={{
                            backgroundColor: expandedId === session.id ? color.hoverBg : color.bg,
                            borderColor: expandedId === session.id ? color.hoverBorder : color.border,
                        }}
                        className='border p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]'
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.hoverBorder; e.currentTarget.style.backgroundColor = color.hoverBg }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = expandedId === session.id ? color.hoverBorder : color.border; e.currentTarget.style.backgroundColor = expandedId === session.id ? color.hoverBg : color.bg }}
                    >
                        <div className='flex items-center justify-between'>
                            <div className='flex-1 min-w-0'>
                                {editingId === session.id ? (
                                    <input
                                        type='text'
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveName}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveName()
                                            if (e.key === 'Escape') cancelEditing()
                                        }}
                                        className='w-full bg-neutral-700 font-bold font-mono text-lg px-2 py-1 rounded border outline-none'
                                        style={{ color: color.text, borderColor: color.border }}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <h2 className='font-bold font-mono text-lg truncate' style={{ color: color.text }}>
                                        {session.name || 'Workout'}
                                    </h2>
                                )}
                                <p className='font-mono text-sm mt-0.5' style={{ color: color.text, opacity: 0.5 }}>
                                    {formatDate(session.date)}
                                </p>
                            </div>
                            <div className='flex items-center gap-2 shrink-0 ml-3'>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        startEditing(session)
                                    }}
                                    style={{ borderColor: color.border, color: color.text }}
                                    className='border p-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:text-white/80'
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete(session.id)
                                    }}
                                    className='border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black p-2 rounded-lg transition-all duration-300'
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {expandedId === session.id && (
                        <div style={{ backgroundColor: color.dropdownBg, borderColor: color.dropdownBorder }} className='border mt-1 rounded-xl p-4 space-y-3'>
                            {exercisesOf(session).map((ex, i) => (
                                <div key={i} style={{ backgroundColor: color.cardBg, borderColor: color.cardBorder }} className='border p-3 rounded-lg transition-all duration-300'>
                                    <div className='flex items-center justify-between'>
                                        <p className='text-white/80 font-semibold font-mono'>{ex.name}</p>
                                        {ex.notes && (
                                            <button
                                                onClick={() => setNotesPopup({ open: true, text: ex.notes })}
                                                className='text-neutral-400 hover:text-white/60 p-1 rounded-lg transition-all duration-300 cursor-pointer'
                                            >
                                                <StickyNote size={18} />
                                            </button>
                                        )}
                                    </div>
                                    {ex.mode === 'timer' ? (
                                        <p className='text-white/40 font-mono text-sm mt-1'>
                                            Time: {setsText(ex)}
                                        </p>
                                    ) : ex.mode === 'counts' ? (
                                        <p className='text-white/40 font-mono text-sm mt-1'>
                                            Counts: {setsText(ex)}
                                        </p>
                                    ) : typeof ex.sets?.[0] === 'object' ? (
                                        <div className='mt-1.5 space-y-1'>
                                            {setLines(ex).map((line, li) => (
                                                <p key={li} className='text-white/40 font-mono text-sm'>
                                                    Set {li + 1}: {line}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <p className='text-white/40 font-mono text-sm mt-1'>
                                                Weight: {ex.weight}
                                            </p>
                                            <p className='text-white/40 font-mono text-sm'>
                                                Sets: {setsText(ex)}
                                            </p>
                                        </>
                                    )}
                                    {Array.isArray(ex.media) && ex.media.length > 0 && (
                                        <button
                                            onClick={() => openViewer(session.id, i, ex.media, 0)}
                                            style={{ backgroundColor: color.cardBg, borderColor: color.cardBorder }}
                                            className='flex items-center gap-1.5 px-3 py-1 border text-white/60 font-mono text-xs rounded-full transition-all cursor-pointer mt-2'
                                            title='View media'
                                        >
                                            <ImageIcon size={14} />
                                            Media ({ex.media.length})
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )})}
            {notesPopup.open && (
                <div
                    className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'
                    onClick={() => setNotesPopup({ open: false, text: '' })}
                >
                    <div
                        className='bg-neutral-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'
                        onClick={e => e.stopPropagation()}
                    >
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='text-white/80 font-bold font-mono text-lg'>Notes</h2>
                            <button
                                onClick={() => setNotesPopup({ open: false, text: '' })}
                                className='text-neutral-400 hover:text-white transition-all duration-300 cursor-pointer'
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className='text-white font-mono text-sm whitespace-pre-wrap'>{notesPopup.text}</p>
                    </div>
                </div>
            )}
            {viewer && (
                <div
                    className='fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4'
                    onClick={closeViewer}
                >
                    <div className='absolute top-4 right-4'>
                        <X className='text-white cursor-pointer' size={32} onClick={closeViewer} />
                    </div>
                    {onDeleteMedia && (
                        <div className='absolute top-5 left-4'>
                            <button
                                onClick={handleViewerDelete}
                                className='flex items-center gap-1.5 bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black p-2 rounded-lg transition-all cursor-pointer'
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    <p className='absolute top-5 left-1/2 -translate-x-1/2 text-white/70 font-mono text-sm'>
                        {viewer.index + 1} / {viewer.items.length}
                    </p>
                    <motion.div
                        key={viewer.url}
                        drag='x'
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, info) => {
                            if (info.offset.x < -50 || info.velocity.x < -300) {
                                if (viewer.index < viewer.items.length - 1) viewerPrevNext(1)
                            } else if (info.offset.x > 50 || info.velocity.x > 300) {
                                if (viewer.index > 0) viewerPrevNext(-1)
                            }
                        }}
                        className='relative max-w-full max-h-[80vh] flex items-center justify-center cursor-grab active:cursor-grabbing'
                        onClick={e => e.stopPropagation()}
                    >
                        {viewer.items[viewer.index]?.type === 'video' ? (
                            <video
                                src={viewer.url}
                                controls
                                autoPlay
                                className='max-w-full max-h-[80vh] rounded-lg'
                            />
                        ) : (
                            <img
                                src={viewer.url}
                                alt={viewer.items[viewer.index]?.fileName}
                                className='max-w-full max-h-[80vh] rounded-lg object-contain pointer-events-none'
                            />
                        )}
                    </motion.div>
                    {viewer.items.length > 1 && (
                        <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4'>
                            <button
                                onClick={(e) => { e.stopPropagation(); viewerPrevNext(-1) }}
                                disabled={viewer.index === 0}
                                className='rounded-full bg-white/10 p-2.5 text-white cursor-pointer hover:bg-white/20 disabled:opacity-30 transition-all'
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); viewerPrevNext(1) }}
                                disabled={viewer.index === viewer.items.length - 1}
                                className='rounded-full bg-white/10 p-2.5 text-white cursor-pointer hover:bg-white/20 disabled:opacity-30 transition-all'
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default SavedSession
