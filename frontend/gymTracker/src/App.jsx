import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './component/AuthPage'
import HomeScreen from './component/HomeScreen'
import UserName from './component/UserName'

function AppContent() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className='w-screen h-screen flex items-center justify-center bg-black'>
                <p className='text-orange-500 font-mono text-xl'>Loading...</p>
            </div>
        )
    }

    if (!user) return <AuthPage />
    if (!user.name) return <UserName onComplete={() => {}} />
    return <HomeScreen />
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}