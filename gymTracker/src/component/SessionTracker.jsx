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
                        className='lg:text-5xl text-3xl text-black bg-white text-center lg:px-3 lg:pt-3 lg:pb-4 px-3 py-2 lg:rounded-2xl rounded-xl font-semibold mb-7 cursor-pointer  active:bg-neutral-200 hover:bg-neutral-100 transition-colors'
                    >
                        Add Exercises
                    </button>
                    <div className='flex flex-col gap-3 font-semibold font-mono text-lg flex-1 scroll'>
                        {exercises.length > 0 ? (
                            exercises.map((exercise, idx) => (
                                <div key={idx} className='flex flex-wrap items-center gap-3 bg-neutral-700 p-3 rounded-lg relative'>
                                    <h2 className='text-white flex-1'>{exercise.name}</h2>
                                    <div className='flex gap-3 mr-1.5 lg:gap-5 lg:mr-5'>
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
                                        className='absolute top-1 right-1 bg-red-700 text-black px-1 text-xs leading-tight rounded hover:bg-neutral-500/70 transition-colors cursor-pointer'
                                    >
                                        X
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className='text-neutral-400'>Click exercises to add them</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className='bg-white text-black font-semibold px-5 py-3 text-2xl rounded-2xl cursor-pointer hover:bg-neutral-200 transition-colors active:bg-neutral-300 w-full'
                >
                    Save
                </button>
            </div>
        </div>
    )
}
export default SessionTracker