import React, { useState } from 'react'
import WeightBar from './WeightBar'
import NumberOfSets from './NumberOfSets'
const SessionTracker = ({ exercises = [], onRemove, onAddExercises, onSessionSaved }) => {
    const [openDropdown, setOpenDropdown] = useState(null)
    const [exerciseWeights, setExerciseWeights] = useState({})
    const [exerciseSets, setExerciseSets] = useState({})
    const setWeight = (idx, weight) => {
        setExerciseWeights(prev => ({ ...prev, [idx]: weight }))
    }
    const setReps = (exerciseIdx, setIdx, value) => {
        setExerciseSets(prev => ({
            ...prev,
            [exerciseIdx]: {
                ...prev[exerciseIdx],
                [setIdx]: value
            }
        }))
    }
    const handleSave = () => {
        if (exercises.length === 0) return
        const sessionData = {
            id: Date.now(),
            date: new Date().toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            }),
            exercises: exercises.map((exercise, idx) => ({
                name: exercise.name,
                weight: exerciseWeights[idx] || '—',
                sets: [
                    exerciseSets[idx]?.[0] || '—',
                    exerciseSets[idx]?.[1] || '—',
                    exerciseSets[idx]?.[2] || '—'
                ]
            }))
        }
        const saved = JSON.parse(localStorage.getItem('gymSessions') || '[]')
        saved.unshift(sessionData)
        localStorage.setItem('gymSessions', JSON.stringify(saved))
        if (onSessionSaved) onSessionSaved()
    }
    return (
        <div className='w-full md:w-3/4 h-full flex justify-center'>
            <div className='flex flex-col h-full w-full justify-between'>
                <div className='px-7 py-7 rounded-2xl overflow-visible flex flex-col'>
                    <button
                        onClick={onAddExercises}
                        className='lg:text-5xl text-3xl text-center lg:px-3 lg:pt-3 lg:pb-4 px-3 py-2 lg:rounded-2xl rounded-xl font-bold mb-7 cursor-pointer border  border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black transition-all duration-300'
                    >
                        Add Exercises
                    </button>
                    <div className='flex flex-col gap-3 font-semibold font-mono text-lg flex-1 scroll'>
                        {exercises.length > 0 ? (
                            exercises.map((exercise, idx) => (
                                <div key={idx} className='flex flex-col gap-3 bg-orange-500/10 border border-neutral-500 p-3 rounded-lg relative transition-all duration-300'>
                                    <h2 className='text-orange-400 flex-1'>{exercise.name}</h2>
                                    <div className='flex gap-5 mr-1.5 lg:gap-5 lg:mr-5'>
                                        <div>
                                            <WeightBar
                                                id={idx}
                                                openDropdown={openDropdown}
                                                setOpenDropdown={setOpenDropdown}
                                                weight={exerciseWeights[idx]}
                                                setWeight={setWeight}
                                            />
                                        </div>
                                        <div className='flex items-center gap-2'>
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
                                    </div>
                                    <button
                                        onClick={() => onRemove(idx)}
                                        className='absolute top-1 right-1 px-2 py-1 text-s leading-tight rounded text-red-500 hover:text-black transition-all duration-300 cursor-pointer'
                                    >
                                        X
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className='text-orange-500/50 tracking-wide'>Click exercises to add them</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={exercises.length === 0}
                    className={`w-1/2 mx-auto block border border-orange-500 bg-orange-500 text-black font-bold px-5 py-3 text-5xl rounded-2xl transition-all duration-300 font-bebas
    ${exercises.length === 0
                            ? 'opacity-30 cursor-not-allowed'
                            : 'cursor-pointer hover:scale-105 hover:bg-orange-400 hover:shadow-orange-500/50 hover:shadow-lg active:scale-95'
                        }`}
                >
                    Save
                </button>
            </div>
        </div>
    )
}
export default SessionTracker