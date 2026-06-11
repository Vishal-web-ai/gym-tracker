import { useAuth } from '../context/AuthContext'

export default function GreetingUser() {
    const { user } = useAuth()


    return (
        <div className='mb-2 leading-tight text-center'>
            <p className='text-white text-6xl sm:text-4xl lg:text-5xl font-mono'>
                Hello,
            </p>
            <p className='text-orange-500 text-5xl sm:text-4xl lg:text-4xl font-bold font-cursive'>
                {user?.name || 'Vishal'}
            </p>
        </div>
    )
}