import { Dumbbell, Target, ArrowLeft } from 'lucide-react'

export default function ExerciseDetail({ exercise, onSelect, onBack }) {
    return (
        <div className='w-full md:w-3/4 h-full flex items-center justify-center p-4'>
            <div className='w-full max-w-md bg-black/60 border border-orange-500/30 rounded-2xl overflow-hidden animate-slideUp'>
                {/* Image Section */}
                <div className='w-full h-48 sm:h-64 relative overflow-hidden bg-neutral-900 p-4'>
                    {exercise.image ? (
                        <div className='rounded-2xl overflow-hidden w-full h-full'>
                            <img
                                src={exercise.image}
                                alt={exercise.name}
                                className='w-full h-full object-contain'
                            />
                        </div>
                    ) : (
                        <div className='w-full h-full flex items-center justify-center'
                            style={{ background: 'linear-gradient(135deg, #1a1a1a 30%, #7c2d12 100%)' }}
                        >
                            <Dumbbell size={80} className='text-orange-500/20' />
                            <div className='absolute inset-0 flex items-center justify-center'>
                                <div className='text-center px-4'>
                                    <p className='text-orange-400 text-lg sm:text-xl font-mono mb-1'>Exercise</p>
                                    <h2 className='text-white text-2xl sm:text-3xl font-bold'>
                                        {exercise.name}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className='p-6 space-y-4'>
                    <div className='flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3'>
                        <Target size={24} className='text-orange-500 shrink-0' />
                        <div>
                            <p className='text-neutral-400 text-xs font-mono uppercase tracking-wider'>Target Muscle</p>
                            <p className='text-white font-semibold text-lg'>{exercise.muscle}</p>
                        </div>
                    </div>


                    {/* Action Buttons */}
                    <div className='flex gap-3 pt-2'>
                        <button
                            onClick={onBack}
                            className='flex items-center justify-center gap-2 flex-1 border border-neutral-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-neutral-800 transition-all duration-300 cursor-pointer'
                        >
                            <ArrowLeft size={20} />
                            Back
                        </button>
                        <button
                            onClick={() => onSelect(exercise)}
                            className='flex-1 bg-orange-500 hover:bg-orange-400 text-black font-bold py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer text-lg'
                        >
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}