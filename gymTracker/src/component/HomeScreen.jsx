import React, { useState } from 'react'
import { RiMenuLine } from '@remixicon/react'
import { Dumbbell } from 'lucide-react'
import ExercisesList from './ExercisesList'
import SessionTracker from './SessionTracker'
import Humberger from './Humberger'
const HomeScreen = () => {
    const [showSession, setShowSession] = useState(false)
    const [showExercisesList, setShowExercisesList] = useState(false)
    const [selectedExercises, setSelectedExercises] = useState([])
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
    const handleSelectExercise = (exerciseName) => {
        setSelectedExercises([...selectedExercises, { name: exerciseName }])
        setShowExercisesList(false)
    }
    const handleRemoveExercise = (idx) => {
        setSelectedExercises(selectedExercises.filter((_, i) => i !== idx))
    }
    const handleStartClick = () => {
        setShowSession(true)
        setShowExercisesList(true)
    }
    const handleAddExercises = () => {
        setShowExercisesList(true)
    }
    const handleCloseExercises = () => {
        setShowExercisesList(false)
    }
    const handleSessionSaved = () => {
        setSelectedExercises([])
        setShowSession(false)
    }
    return (
        <div className='w-full h-full bg-black text-white flex flex-col overflow-hidden'>
            <div className='w-full flex items-center justify-between px-5 h-20'>
                <div className='cursor-pointer' onClick={() => setIsHamburgerOpen(true)}>
                    <RiMenuLine color="white" size={50} />
                </div>
                <div className='mt-3 lg:mt-10'><Dumbbell size={60} /></div>
            </div>
            {!showSession ? (
                <div className='h-3/4 w-full flex flex-col justify-center items-center gap-8'>
                    <h1 className='lg:text-8xl text-6xl font-bebas'>What would you<br />like to do today</h1>
                    <button
                        onClick={handleStartClick}
                        className='bg-neutral-600 px-5 py-3 text-3xl rounded-2xl cursor-pointer active:bg-neutral-700 hover:bg-neutral-500 transition-colors'
                    >
                        Start
                    </button>
                </div>
            ) : (
                <div key={showExercisesList} className='scroll flex-1 w-full flex justify-center items-center p-5 animate-slideUp overflow-y-auto'>
                    {showExercisesList ? (
                        <ExercisesList
                            onSelectExercise={handleSelectExercise}
                            onClose={handleCloseExercises}
                        />
                    ) : (
                        <SessionTracker
                            exercises={selectedExercises}
                            onRemove={handleRemoveExercise}
                            onAddExercises={handleAddExercises}
                            onSessionSaved={handleSessionSaved}
                        />
                    )}
                </div>
            )}
            <Humberger
                isOpen={isHamburgerOpen}
                onClose={() => setIsHamburgerOpen(false)}
            />
        </div>
    )
}
export default HomeScreen