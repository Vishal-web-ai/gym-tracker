import { useState } from 'react'
import { RiFileEditLine } from '@remixicon/react'
import WeightBar from './WeightBar'
import NumberOfSets from './NumberOfSets'
import api from '../services/api'

const SessionTracker = ({ exercises = [], onRemove, onAddExercises, onSessionSaved, exerciseWeights, exerciseSets, exerciseNotes, setWeight, setReps, setNotes }) => {
    const [openDropdown, setOpenDropdown] = useState(null)
    const [showNameModal, setShowNameModal] = useState(false)
    const [workoutName, setWorkoutName] = useState('')
    const [showNotes, setShowNotes] = useState({})

    const handleSaveClick = () => {
        setWorkoutName('')
        setShowNameModal(true)
    }

    const handleConfirmSave = async () => {
        if (exercises.length === 0) return
        setShowNameModal(false)
        try {
            const now = new Date()
            await api.post('/sessions', {
                date: now.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }),
                name: workoutName.trim() || 'Workout',
                exercises: exercises.map((exercise, idx) => ({
                    name: exercise.name,
                    weight: exerciseWeights[idx] || '—',
                    sets: [
                        exerciseSets[idx]?.[0] || '—',
                        exerciseSets[idx]?.[1] || '—',
                        exerciseSets[idx]?.[2] || '—'
                    ],
                    notes: exerciseNotes?.[idx] || ''
                }))
            })
            if (onSessionSaved) onSessionSaved(workoutName.trim() || 'Workout')
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to save session'
            alert(msg)
        }
    }

    return (
        <div className='w-full md:w-3/4 h-full flex justify-center'>
            <div className='flex flex-col h-full w-full'>
                <div className='shrink-0 px-5 sm:px-7 pt-5 sm:pt-7 pb-3'>
                    <button
                        onClick={onAddExercises}
                        className='w-full text-2xl sm:text-3xl lg:text-5xl text-center px-3 py-2 sm:px-3 sm:py-2 lg:px-3 lg:pt-3 lg:pb-4 rounded-xl lg:rounded-2xl font-bold cursor-pointer border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black transition-all duration-300'
                    >
                        Add Exercises
                    </button>
                </div>

                <div className='flex-1 overflow-y-auto px-5 sm:px-7 scroll'>
                    <div className='flex flex-col gap-3 font-semibold font-mono text-base sm:text-lg'>
                        {exercises.length > 0 ? (
                            exercises.map((exercise, idx) => (
                                <div
                                    key={idx}
                                    className='flex flex-col gap-3 bg-orange-500/10 border border-neutral-500 p-3 rounded-lg transition-all duration-300'
                                >
                                    <div className='flex justify-between items-center'>
                                        <h2 className='text-orange-400 text-sm sm:text-base'>
                                            {exercise.name}
                                        </h2>
                                        <button
                                            onClick={() => onRemove(idx)}
                                            className='px-2 py-1 text-s leading-tight rounded text-red-500 hover:text-black transition-all duration-300 cursor-pointer'
                                        >
                                            X
                                        </button>
                                    </div>
                                    <div className='flex gap-2 sm:gap-3 items-center flex-wrap'>
                                        <div>
                                            <WeightBar
                                                id={idx}
                                                openDropdown={openDropdown}
                                                setOpenDropdown={setOpenDropdown}
                                                weight={exerciseWeights[idx]}
                                                setWeight={setWeight}
                                            />
                                        </div>
                                        <div className='flex items-center gap-1 sm:gap-1.5'>
                                            <NumberOfSets
                                                reps={exerciseSets[idx]?.[0] || ''}
                                                setReps={(_, val) => setReps(idx, 0, val)}  
                                                idx={0}
                                            />
                                            <NumberOfSets
                                                reps={exerciseSets[idx]?.[1] || ''}
                                                setReps={(_, val) => setReps(idx, 1, val)}
                                                idx={1}
                                            />
                                            <NumberOfSets
                                                reps={exerciseSets[idx]?.[2] || ''}
                                                setReps={(_, val) => setReps(idx, 2, val)}
                                                idx={2}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowNotes(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                            className={'ml-auto p-1.5 rounded-lg transition-all duration-300 cursor-pointer text-white'}
                                            title="Notes"
                                        >
                                            <RiFileEditLine size={20} />
                                        </button>
                                    </div>
                                    {showNotes[idx] && (
                                        <textarea
                                            value={exerciseNotes?.[idx] || ''}
                                            onChange={(e) => setNotes(idx, e.target.value)}
                                            onInput={(e) => {
                                                e.target.style.height = 'auto'
                                                e.target.style.height = e.target.scrollHeight + 'px'
                                            }}
                                            placeholder="Notes..."
                                            rows={1}
                                            className='w-full bg-neutral-900 text-white text-sm border border-orange-500/30 rounded-lg px-3 py-2 outline-none focus:border-orange-500 placeholder-neutral-500 resize-none overflow-hidden transition-all duration-300'
                                        />
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className='text-orange-500/50 tracking-wide text-center py-10'>
                                No exercises yet. Tap "Add Exercises" to start.
                            </p>
                        )}
                    </div>
                </div>

                <div className='shrink-0 px-5 sm:px-7 pb-5 sm:pb-7 pt-3'>
                    <button
                        onClick={handleSaveClick}
                        disabled={exercises.length === 0}
                        className={`w-full sm:w-1/2 mx-auto block border border-orange-500 bg-orange-500 text-black font-bold px-5 py-2.5 sm:py-3 text-3xl sm:text-4xl lg:text-5xl rounded-2xl transition-all duration-300 font-bebas ${exercises.length === 0
                            ? 'opacity-30 cursor-not-allowed'
                            : 'cursor-pointer hover:scale-105 hover:bg-orange-400 hover:shadow-orange-500/50 hover:shadow-lg active:scale-95'
                            }`}
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* Name Modal */}
            {showNameModal && (
                <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'>
                    <div className='bg-neutral-800 border border-orange-500/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-popIn'>
                        <h2 className='text-white text-xl font-bold font-mono mb-4'>Name this workout</h2>
                        <input
                            type='text'
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            placeholder='e.g. Chest Day, Push Day...'
                            className='w-full bg-neutral-900 text-white border border-orange-500/30 rounded-xl px-4 py-3 font-mono outline-none focus:border-orange-500 placeholder-neutral-500'
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmSave()
                            }}
                        />
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowNameModal(false)}
                                className='flex-1 border border-neutral-600 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                className='flex-1 bg-orange-500 text-black font-bold py-3 rounded-xl hover:bg-orange-400 transition-all duration-300 cursor-pointer font-mono'
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SessionTracker