import { useEffect, useState } from 'react'
import HomeScreen from './component/HomeScreen'
import Onboarding from './component/Onboarding'
import { getUserProfile } from './services/storage'

const DESIGN_WIDTH = 375
const DESIGN_HEIGHT = 667

const getScale = () => {
    const widthScale = window.innerWidth / DESIGN_WIDTH
    const heightScale = window.innerHeight / DESIGN_HEIGHT
    return Math.min(Math.max(Math.min(widthScale, heightScale), 0.5), 1.4)
}

export default function App() {
    const [status, setStatus] = useState('checking')
    const [scale, setScale] = useState(getScale)

    useEffect(() => {
        const onResize = () => setScale(getScale())
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    useEffect(() => {
        if (navigator.storage?.persist) {
            navigator.storage.persist()
        }
        getUserProfile()
            .then(profile => {
                setStatus(profile && (profile.joinedAt || profile.age) ? 'home' : 'onboarding')
            })
            .catch(() => setStatus('onboarding'))
    }, [])

    const content =
        status === 'checking' ? (
            <div
                className='w-full h-full flex items-center justify-center'
                style={{ background: '#050505' }}
            >
                <div
                    className='w-10 h-10 rounded-full animate-spin'
                    style={{ border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316' }}
                />
            </div>
        ) : status === 'home' ? (
            <HomeScreen />
        ) : (
            <Onboarding onDone={() => setStatus('home')} />
        )

    return (
        <div
            className='w-screen overflow-hidden flex items-center justify-center'
            style={{ background: '#050505', height: window.innerHeight }}
        >
            <div
                className='shrink-0'
                style={{
                    width: DESIGN_WIDTH,
                    height: window.innerHeight / scale,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    position: 'relative'
                }}
            >
                {content}
            </div>
        </div>
    )
}
