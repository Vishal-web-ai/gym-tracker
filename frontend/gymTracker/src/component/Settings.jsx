import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Volume2, Play, X, Dumbbell } from 'lucide-react'
import { RiEditLine, RiCalendarLine, RiTrophyLine, RiVolumeUpLine, RiDownloadLine, RiUploadLine } from '@remixicon/react'
import ScheduleEditor from './ScheduleEditor'
import ChallengePicker from './ChallengePicker'
import { playBeep } from '../services/audio'
import { getSchedule, saveSchedule, getRestSound, saveRestSound, getCustomExercises } from '../services/storage'
import { getChallengePicks, saveChallengePicks } from '../services/progression'
import { exportBackup, importBackup } from '../services/backup'
import { getErrorMessage } from '../services/errors'

function formatBytes(bytes) {
    if (!bytes) return '0 MB'
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const Settings = ({ onClose, onScheduleSaved, onChallengesSaved, onOpenMyExercises, onOpenProfileEditor }) => {
    const [backupBusy, setBackupBusy] = useState(false)
    const [busyLabel, setBusyLabel] = useState('')
    const [storageInfo, setStorageInfo] = useState(null)
    const [showScheduleEditor, setShowScheduleEditor] = useState(false)
    const [schedule, setSchedule] = useState({})
    const [showChallengePicker, setShowChallengePicker] = useState(false)
    const [picks, setPicks] = useState({})
    const [customExercises, setCustomExercises] = useState([])
    const [sound, setSound] = useState(null)
    const [showSoundModal, setShowSoundModal] = useState(false)
    const restoreInputRef = useRef(null)
    const soundInputRef = useRef(null)

    useEffect(() => {
        let cancelled = false
        getSchedule()
            .then(schedule => {
                if (!cancelled) setSchedule(schedule)
            })
            .catch(() => {})
        getChallengePicks()
            .then(picks => {
                if (!cancelled) setPicks(picks)
            })
            .catch(() => {})
        getCustomExercises()
            .then(list => {
                if (!cancelled) setCustomExercises(list)
            })
            .catch(() => {})
        getRestSound()
            .then(s => {
                if (!cancelled) setSound(s)
            })
            .catch(() => {})
        if (navigator.storage?.estimate) {
            navigator.storage.estimate()
                .then(info => {
                    if (!cancelled) setStorageInfo(info)
                })
                .catch(() => {})
        }
        return () => { cancelled = true }
    }, [])

    const handleSaveSchedule = async () => {
        try {
            await saveSchedule(schedule)
            setShowScheduleEditor(false)
            onScheduleSaved?.()
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const handleSaveChallenges = async () => {
        try {
            await saveChallengePicks(picks)
            setShowChallengePicker(false)
            onChallengesSaved?.()
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const handleSoundFile = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        const newSound = { name: file.name, blob: file }
        setSound(newSound)
        try {
            await saveRestSound(newSound)
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const handleResetSound = async () => {
        setSound(null)
        try {
            await saveRestSound(null)
        } catch (err) {
            alert(getErrorMessage(err))
        }
    }

    const testSound = () => {
        if (sound?.blob) {
            const url = URL.createObjectURL(sound.blob)
            const audio = new Audio(url)
            audio.onended = () => {
                audio.src = ''
                URL.revokeObjectURL(url)
            }
            audio.play().catch(() => URL.revokeObjectURL(url))
            setTimeout(() => {
                audio.pause()
                audio.src = ''
                URL.revokeObjectURL(url)
            }, 5000)
        } else {
            playBeep()
        }
    }

    const handleBackup = async () => {
        if (backupBusy) return
        setBackupBusy(true)
        setBusyLabel('Preparing...')
        try {
            const filename = await exportBackup({
                onProgress: ({ current, total, label }) => {
                    setBusyLabel(`Backing up ${current}/${total}: ${label}`)
                }
            })
            alert(`Backup saved as ${filename}`)
        } catch (err) {
            alert(getErrorMessage(err))
        } finally {
            setBackupBusy(false)
            setBusyLabel('')
        }
    }

    const handleRestore = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!confirm('Restoring a backup REPLACES all current workouts, exercises, and memories on this device with the contents of the backup. This cannot be undone. Continue?')) return
        setBackupBusy(true)
        setBusyLabel('Preparing...')
        try {
            const result = await importBackup(file, {
                onProgress: ({ current, total, label }) => {
                    setBusyLabel(`Restoring ${current}/${total}: ${label}`)
                }
            })
            const note = result?.skippedMedia
                ? `\n\nNote: ${result.skippedMedia} media file(s) were missing from the backup and were skipped.`
                : ''
            alert(`Backup restored!${note}`)
            window.location.reload()
        } catch (err) {
            alert(getErrorMessage(err))
        } finally {
            setBackupBusy(false)
            setBusyLabel('')
        }
    }

    const quotaTotal = storageInfo?.quota ? formatBytes(storageInfo.quota) : null
    const usagePct = storageInfo?.quota
        ? Math.round((storageInfo.usage / storageInfo.quota) * 100)
        : null

    return (
        <div className='fixed inset-0 bg-neutral-900 z-50 flex flex-col'>
            <div className='flex items-center gap-3 px-5 h-16 border-b border-neutral-700 shrink-0'>
                <ArrowLeft
                    size={28}
                    className='text-white cursor-pointer hover:opacity-70'
                    onClick={onClose}
                />
                <h1 className='text-white text-xl font-bold font-mono'>Settings</h1>
            </div>

            <div className='flex-1 overflow-y-auto p-4 scroll flex flex-col gap-3'>
                {busyLabel && (
                    <p className='text-orange-400 text-center font-mono text-xs'>{busyLabel}</p>
                )}
                <button
                    onClick={onOpenProfileEditor}
                    className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                >
                    <RiEditLine size={20} />
                    Change User Info
                </button>
                <button
                    onClick={() => setShowScheduleEditor(true)}
                    className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                >
                    <RiCalendarLine size={20} />
                    Workout Schedule
                </button>
                <button
                    onClick={onOpenMyExercises}
                    className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                >
                    <Dumbbell size={20} />
                    Add Your Exercises
                </button>
                <button
                    onClick={() => setShowChallengePicker(true)}
                    className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                >
                    <RiTrophyLine size={20} />
                    Challenge Exercises
                </button>
                <button
                    onClick={() => setShowSoundModal(true)}
                    className='w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer'
                >
                    <RiVolumeUpLine size={20} />
                    Alarm Sound
                </button>
                <button
                    onClick={handleBackup}
                    disabled={backupBusy}
                    className='w-full flex items-center justify-center gap-2 bg-neutral-700/50 hover:bg-neutral-700 text-white font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50'
                >
                    <RiDownloadLine size={20} />
                    Backup Data
                </button>
                <button
                    onClick={() => restoreInputRef.current?.click()}
                    disabled={backupBusy}
                    className='w-full flex items-center justify-center gap-2 bg-neutral-700/50 hover:bg-neutral-700 text-white font-mono font-bold py-3 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50'
                >
                    <RiUploadLine size={20} />
                    Restore Backup
                </button>
                <input
                    ref={restoreInputRef}
                    type='file'
                    accept='.zip,application/zip,.json,application/json'
                    onChange={handleRestore}
                    className='hidden'
                />
                {storageInfo && quotaTotal && usagePct !== null && (
                    <p className='text-neutral-400 text-center font-mono text-[11px] pt-1 border-t border-neutral-700'>
                        Storage: {formatBytes(storageInfo.usage)} of {quotaTotal} ({usagePct}%) · Backup regularly
                    </p>
                )}
            </div>

            {/* Schedule editor modal */}
            {showScheduleEditor && (
                <div
                    className='fixed inset-0 bg-neutral-900 z-[60] flex flex-col items-center justify-center p-4'
                    onClick={() => setShowScheduleEditor(false)}
                >
                    <div
                        className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto scroll animate-popIn'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className='font-bebas text-orange-500 tracking-[2px] text-2xl mb-4 text-center'>
                            WORKOUT SCHEDULE
                        </h2>
                        <ScheduleEditor schedule={schedule} onChange={setSchedule} selectedFirst />
                    </div>
                    <div className='flex gap-3 mt-4 w-full' onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowScheduleEditor(false)}
                            className='flex-1 border border-neutral-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-neutral-700 transition-all cursor-pointer font-mono text-base'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveSchedule}
                            className='flex-1 bg-orange-500 text-black font-bold py-4 px-6 rounded-xl hover:bg-orange-400 transition-all cursor-pointer font-mono text-base'
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* Challenge picker modal */}
            {showChallengePicker && (
                <div
                    className='fixed inset-0 bg-neutral-900 z-[60] flex items-center justify-center p-4'
                    onClick={() => setShowChallengePicker(false)}
                >
                    <div
                        className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto scroll animate-popIn'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className='font-bebas text-orange-500 tracking-[2px] text-2xl mb-1 text-center'>
                            CHALLENGE EXERCISES
                        </h2>
                        <ChallengePicker schedule={schedule} customExercises={customExercises} picks={picks} onChange={setPicks} />
                        <div className='flex gap-3 mt-4'>
                            <button
                                onClick={() => setShowChallengePicker(false)}
                                className='flex-1 border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all cursor-pointer font-mono'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveChallenges}
                                className='flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all cursor-pointer font-mono'
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alarm Sound Modal */}
            {showSoundModal && (
                <div
                    className='fixed inset-0 bg-neutral-900 z-[60] flex items-center justify-center p-4'
                    onClick={() => setShowSoundModal(false)}
                >
                    <div
                        className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className='font-bebas text-orange-500 tracking-[2px] text-2xl text-center mb-4'>
                            ALARM SOUND SETTINGS
                        </h2>
                        <button
                            onClick={() => soundInputRef.current?.click()}
                            className='w-full flex items-center justify-center gap-2 border border-orange-500/40 text-orange-500 font-mono text-sm py-2.5 rounded-xl hover:bg-orange-500/10 transition-all cursor-pointer'
                        >
                            <Volume2 size={16} />
                            Choose Alarm Sound
                        </button>
                        <input
                            ref={soundInputRef}
                            type='file'
                            accept='audio/*'
                            onChange={handleSoundFile}
                            className='hidden'
                        />
                        <div className='flex items-center justify-between gap-2 mt-4'>
                            <p className='text-white/60 font-mono text-xs truncate flex-1'>
                                {sound ? sound.name : 'Default beep'}
                            </p>
                            <button
                                onClick={testSound}
                                className='flex items-center gap-1 text-orange-500 font-mono text-xs border border-orange-500/40 px-2.5 py-1 rounded-lg hover:bg-orange-500/10 transition-all cursor-pointer'
                            >
                                <Play size={12} /> Test
                            </button>
                            {sound && (
                                <button
                                    onClick={handleResetSound}
                                    className='flex items-center gap-1 text-red-400 font-mono text-xs border border-red-500/40 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer'
                                >
                                    <X size={12} /> Reset
                                </button>
                            )}
                        </div>
                        <div className='mt-6'>
                            <button
                                onClick={() => setShowSoundModal(false)}
                                className='w-full border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default Settings
