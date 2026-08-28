// This file intentionally bundles the provider component and the context +
// hook, so it does not satisfy react-refresh's single-export rule.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import { getDeviceTier } from '../services/device'

// Tier-based config so every part of the UI can keep the same look while
// trimming the most expensive effects on weak devices.
const TIER_CONFIG = {
    lite: {
        confettiCount: 0,
        gsapEnabled: false,
        thumbnailMax: 320,
        infiniteMotion: false,
        dragEnabled: false
    },
    full: {
        confettiCount: 40,
        gsapEnabled: true,
        thumbnailMax: 600,
        infiniteMotion: true,
        dragEnabled: true
    }
}

const DeviceContext = createContext({ lite: false, tier: getDeviceTier(), config: TIER_CONFIG.full })

export function DeviceProvider({ children }) {
    const value = useMemo(() => {
        const tier = getDeviceTier()
        return { lite: tier.lite, tier, config: tier.lite ? TIER_CONFIG.lite : TIER_CONFIG.full }
    }, [])
    return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}

export function useDevice() {
    return useContext(DeviceContext)
}
