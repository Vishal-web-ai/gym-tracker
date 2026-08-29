import { useEffect, useState } from 'react'
import HomeScreen from './component/HomeScreen'
import Onboarding from './component/Onboarding'
import { getUserProfile } from './services/storage'

const DESIGN_WIDTH = 375

const getScale = () => {
    const widthScale = window.innerWidth / DESIGN_WIDTH
    return Math.min(Math.max(widthScale, 0.5), 1.8)
}

export default function App() {
    const [status, setStatus] = useState('checking')
    const [scale, setScale] = useState(getScale)
    // scale(1) is a no-op yet still forces the whole app onto a composited
    // layer, which re-rasterizes on every navigation render. Skip it when the
    // viewport already matches — biggest nav-jank win on non-1:1 phones.
    const needsScale = Math.abs(scale - 1) > 0.001

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
                    height: window.innerHeight / (needsScale ? scale : 1),
                    transform: needsScale ? `scale(${scale})` : 'none',
                    transformOrigin: 'center center',
                    position: 'relative',
                    boxSizing: 'border-box',
                    '--scale': needsScale ? scale : 1,
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) / var(--scale))'
                }}
            >
                {content}
            </div>
        </div>
    )
}
