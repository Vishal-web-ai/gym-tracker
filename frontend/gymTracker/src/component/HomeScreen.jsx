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
    const [isFromStart, setIsFromStart] = useState(false)
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false)
    const handleSelectExercise = (exerciseName) => {
        setSelectedExercises([...selectedExercises, { name: exerciseName }])
        setShowExercisesList(false)
        setIsFromStart(false)          // ← now in session flow
    }
    const handleRemoveExercise = (idx) => {
        setSelectedExercises(selectedExercises.filter((_, i) => i !== idx))
    }
    const handleStartClick = () => {
        setShowSession(true)
        setShowExercisesList(true)
        setIsFromStart(true)           // ← mark: came from Start
    }
    const handleAddExercises = () => {
        setShowExercisesList(true)
        setIsFromStart(false)          // ← came from SessionTracker, not Start
    }
    const handleCloseExercises = () => {
        setShowExercisesList(false)
        if (isFromStart) {             // ← only go HomeScreen if opened from Start
            setShowSession(false)
            setSelectedExercises([])
        }
    }
    const handleSessionSaved = () => {
        setSelectedExercises([])
        setShowSession(false)
    }
    return (
        <div
            className='w-full h-full text-white flex flex-col overflow-hidden relative'
            style={{ background: 'linear-gradient(-225deg, #111111 45%, #9a3412 86%, #f97316 100%)' }}
        >
            {/* your content below unchanged... */}
            <div className='w-full flex items-center justify-between px-5 h-20 relative z-10'>
                <div className='cursor-pointer' onClick={() => setIsHamburgerOpen(true)}>
                    <RiMenuLine color="white" size={50} />
                </div>
                <div className='mt-3 lg:mt-10'><Dumbbell size={60} /></div>
            </div>

            {!showSession ? (
                <div className='h-3/4 w-full flex flex-col justify-center items-center gap-8 relative z-10'>
                    <h1 className='border border-orange-500 text-orange-500 tracking-wider text-center text-3xl px-6 py-2  rounded-2xl font-bebas'>Gym Tracker</h1>
                    <h1 className='lg:text-8xl text-6xl font-inter px-8'>What would you<br />like to do <span className='font-bold text-orange-500'>today?</span></h1>
                    <button
                        onClick={handleStartClick}
                        className='absolute bottom-0 px-7 py-3 text-3xl font-semibold rounded-2xl cursor-pointer border border-transparent hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-500 transition-all duration-300 flex items-center gap-3 group'
                    >
                        Start Session
                        <span className='text-4xl font-semibold text-orange-500 tracking-[.4em] group-hover:translate-x-2 transition-transform duration-300'>→</span>
                    </button>
                </div>
            ) : (
                <div key={showExercisesList} className='scroll flex-1 w-full flex justify-center items-center p-5 animate-slideUp overflow-y-auto relative z-10'>
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