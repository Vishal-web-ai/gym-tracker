export default function GreetingUser({ name }) {
    return (
        <div className='mb-2 leading-tight text-center'>
            <p className='text-white text-4xl font-mono'>
                Hello,
            </p>
            <p className='text-orange-500 text-3xl font-bold font-cursive'>
                {name || 'Vishal'}
            </p>
        </div>
    )
}
