import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useDevice } from './DeviceContext'

let gsapPromise = null
function loadGsap() {
    if (!gsapPromise) gsapPromise = import('gsap')
    return gsapPromise
}

const StaggeredMenu = ({
    position = 'right',
    colors = ['#c2410c', '#7c2d12'],
    items = [],
    socialItems = [],
    displaySocials = false,
    displayItemNumbering = true,
    accentColor = '#f97316',
    open = false,
    onClose,
    onMenuOpen,
    onMenuClose
}) => {
    const openRef = useRef(open)
    const busyRef = useRef(false)
    const gsapRef = useRef(null)
    const { lite } = useDevice()
    const panelRef = useRef(null)
    const preLayersRef = useRef(null)
    const preLayerElsRef = useRef([])

    const openTlRef = useRef(null)
    const closeTweenRef = useRef(null)
    const itemEntranceTweenRef = useRef(null)
    const ctxRef = useRef(null)

    const setLiteOpen = (open) => {
        const panel = panelRef.current
        const preContainer = preLayersRef.current
        if (!panel) return
        const preLayers = preContainer ? Array.from(preContainer.querySelectorAll('.sm-prelayer')) : []
        if (open) {
            panel.style.opacity = '1'
            panel.style.transform = 'translateX(0)'
            preLayers.forEach((el) => { el.style.transform = 'translateX(0)'; el.style.opacity = '1' })
            // CSS transition-delay (--i) gives a cheap staggered entrance — no GSAP needed on lite.
            panel.querySelectorAll('.sm-panel-itemLabel').forEach((el) => { el.style.transform = 'translateY(0)'; el.style.opacity = '1' })
        } else {
            panel.style.opacity = '0'
            panel.style.transform = 'translateX(100%)'
            preLayers.forEach((el) => { el.style.transform = 'translateX(100%)'; el.style.opacity = '0' })
            // Hidden start state so the next open animates from behind.
            panel.querySelectorAll('.sm-panel-itemLabel').forEach((el) => { el.style.transform = 'translateY(120%)'; el.style.opacity = '0' })
        }
    }

    useLayoutEffect(() => {
        if (lite) {
            // Initial closed state: labels behind, panel off-screen. CSS handles
            // the stagger on open so weak devices skip the GSAP timeline.
            const panel = panelRef.current
            if (panel) {
                panel.style.opacity = '0'
                panel.style.transform = 'translateX(100%)'
                panel.querySelectorAll('.sm-panel-itemLabel').forEach((el) => { el.style.transform = 'translateY(120%)'; el.style.opacity = '0' })
            }
            const preContainer = preLayersRef.current
            if (preContainer) Array.from(preContainer.querySelectorAll('.sm-prelayer')).forEach((el) => { el.style.transform = 'translateX(100%)'; el.style.opacity = '0' })
            return
        }
        let mounted = true
        loadGsap().then((mod) => {
            if (!mounted) return
            gsapRef.current = mod.gsap
            const gsap = mod.gsap
            const ctx = gsap.context(() => {
                const panel = panelRef.current
                const preContainer = preLayersRef.current
                if (!panel) return

                let preLayers = []
                if (preContainer) {
                    preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'))
                }
                preLayerElsRef.current = preLayers

                const offscreen = position === 'left' ? -100 : 100
                gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 })
            })
            ctxRef.current = ctx
        })
        return () => { mounted = false; ctxRef.current?.revert() }
    }, [position, lite])

    const withG = async (fn) => {
        if (!gsapRef.current) {
            const mod = await loadGsap()
            gsapRef.current = mod.gsap
        }
        return fn(gsapRef.current)
    }

    const buildOpenTimeline = useCallback((gsap) => {
        const panel = panelRef.current
        const layers = preLayerElsRef.current
        if (!panel) return null

        openTlRef.current?.kill()
        if (closeTweenRef.current) {
            closeTweenRef.current.kill()
            closeTweenRef.current = null
        }
        itemEntranceTweenRef.current?.kill()

        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'))
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'))
        const socialTitle = panel.querySelector('.sm-socials-title')
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'))

        const offscreen = position === 'left' ? -100 : 100
        const layerStates = layers.map(el => ({ el, start: offscreen }))
        const panelStart = offscreen

        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 })
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 })
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 })
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 })

        const tl = gsap.timeline({ paused: true })

        layerStates.forEach((ls, i) => {
            tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out', force3D: true }, i * 0.07)
        })

        const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0
        const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0)
        const panelDuration = 0.65

        tl.fromTo(
            panel,
            { xPercent: panelStart },
            { xPercent: 0, duration: panelDuration, ease: 'power4.out', force3D: true },
            panelInsertTime
        )

        if (itemEls.length) {
            const itemsStart = panelInsertTime + panelDuration * 0.15

            tl.to(
                itemEls,
                { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
                itemsStart
            )

            if (numberEls.length) {
                tl.to(
                    numberEls,
                    { duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: { each: 0.08, from: 'start' } },
                    itemsStart + 0.1
                )
            }
        }

        if (socialTitle || socialLinks.length) {
            const socialsStart = panelInsertTime + panelDuration * 0.4

            if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart)
            if (socialLinks.length) {
                tl.to(
                    socialLinks,
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.55,
                        ease: 'power3.out',
                        stagger: { each: 0.08, from: 'start' },
                        onComplete: () => {
                            gsap.set(socialLinks, { clearProps: 'opacity' })
                        }
                    },
                    socialsStart + 0.04
                )
            }
        }

        openTlRef.current = tl
        return tl
    }, [position])

    const playOpen = useCallback(() => {
        if (busyRef.current) return
        busyRef.current = true
        if (lite) {
            setLiteOpen(true)
            busyRef.current = false
            return
        }
        withG((gsap) => {
            const tl = buildOpenTimeline(gsap)
            if (tl) {
                tl.eventCallback('onComplete', () => {
                    busyRef.current = false
                })
                tl.play(0)
            } else {
                busyRef.current = false
            }
        })
    }, [lite, buildOpenTimeline])

    const playClose = useCallback(() => {
        openTlRef.current?.kill()
        openTlRef.current = null
        itemEntranceTweenRef.current?.kill()

        const panel = panelRef.current
        const layers = preLayerElsRef.current
        if (!panel) return

        closeTweenRef.current?.kill()

        if (lite) {
            setLiteOpen(false)
            busyRef.current = false
            return
        }

        const gsap = gsapRef.current
        if (!gsap) {
            busyRef.current = false
            return
        }

        const offscreen = position === 'left' ? -100 : 100

        const onComplete = () => {
            const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'))
            if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 })

            const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'))
            if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 })

            const socialTitle = panel.querySelector('.sm-socials-title')
            const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'))
            if (socialTitle) gsap.set(socialTitle, { opacity: 0 })
            if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 })

            busyRef.current = false
        }

        const tl = gsap.timeline({ onComplete })
        const panelStart = 0
        const panelDuration = 0.5
        tl.to(panel, { xPercent: offscreen, duration: panelDuration, ease: 'power4.in', force3D: true }, panelStart)
        const reversed = [...layers].reverse()
        reversed.forEach((layer, i) => {
            const start = i === 0 ? 0 : 0.15 + (i - 1) * 0.04
            const duration = i === 0 ? 0.6 : 0.6
            tl.to(layer, { xPercent: offscreen, duration, ease: 'power4.in', force3D: true }, start)
        })
        closeTweenRef.current = tl
    }, [position, lite])

    useEffect(() => {
        if (open === openRef.current) return
        openRef.current = open
        if (open) {
            onMenuOpen?.()
            playOpen()
        } else {
            onMenuClose?.()
            playClose()
        }
    }, [open, playOpen, playClose, onMenuOpen, onMenuClose])

    useEffect(() => {
        if (!open) return

        const handleClickOutside = event => {
            if (event.target.closest('[data-menu-toggle]')) return
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose?.()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open, onClose])

    return (
        <div className='sm-scope absolute inset-0 z-30 pointer-events-none'>
                <div
                    className='staggered-menu-wrapper pointer-events-none relative w-full h-full'
                    style={accentColor ? { '--sm-accent': accentColor } : undefined}
                    data-position={position}
                    data-lite={lite || undefined}
                    data-open={open || undefined}
                >
                <div ref={preLayersRef} className='sm-prelayers absolute top-0 right-0 bottom-0 pointer-events-none z-[5]' aria-hidden='true'>
                    {(() => {
                        const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c']
                        let arr = [...raw]
                        if (arr.length >= 3) {
                            const mid = Math.floor(arr.length / 2)
                            arr.splice(mid, 1)
                        }
                        return arr.map((c, i) => (
                            <div key={i} className='sm-prelayer absolute top-0 right-0 h-full w-full' style={{ background: c }} />
                        ))
                    })()}
                </div>

                <aside
                    id='staggered-menu-panel'
                    ref={panelRef}
                    className='staggered-menu-panel absolute top-0 right-0 h-full flex flex-col overflow-y-auto z-10 pointer-events-auto'
                    aria-hidden={!open}
                >
                    <div className='sm-panel-inner flex-1 flex flex-col gap-5'>
                        <ul
                            className='sm-panel-list list-none m-0 p-0 flex flex-col gap-2'
                            role='list'
                            data-numbering={displayItemNumbering || undefined}
                        >
                            {items && items.length ? (
                                items.map((it, idx) => (
                                    <li className='sm-panel-itemWrap relative overflow-hidden leading-none' key={it.label + idx}>
                                        <button
                                            type='button'
                                            className='sm-panel-item relative cursor-pointer leading-none inline-flex items-baseline no-underline'
                                            aria-label={it.ariaLabel}
                                            data-index={idx + 1}
                                            onClick={it.onClick}
                                        >
                                            {displayItemNumbering && (
                                                <span className='sm-panel-itemNum font-mono' aria-hidden='true'>
                                                    {String(idx + 1).padStart(2, '0')}
                                                </span>
                                            )}
                                            <span className='sm-panel-itemLabel inline-block [transform-origin:50%_100%] will-change-transform' style={{ '--i': idx }}>
                                                {it.label}
                                            </span>
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <li className='sm-panel-itemWrap relative overflow-hidden leading-none' aria-hidden='true'>
                                    <span className='sm-panel-item relative leading-none inline-flex items-baseline no-underline'>
                                        <span className='sm-panel-itemLabel inline-block [transform-origin:50%_100%] will-change-transform'>
                                            No items
                                        </span>
                                    </span>
                                </li>
                            )}
                        </ul>

                        {displaySocials && socialItems && socialItems.length > 0 && (
                            <div className='sm-socials mt-auto pt-8 flex flex-col gap-3' aria-label='Social links'>
                                <h3 className='sm-socials-title m-0 font-medium [color:var(--sm-accent,#f97316)]'>Socials</h3>
                                <ul className='sm-socials-list list-none m-0 p-0 flex flex-row items-center gap-4 flex-wrap' role='list'>
                                    {socialItems.map((s, i) => (
                                        <li key={s.label + i} className='sm-socials-item'>
                                            <a
                                                href={s.link}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='sm-socials-link no-underline relative inline-block'
                                            >
                                                {s.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            <style>{`
.sm-scope .staggered-menu-wrapper { position: relative; width: 100%; height: 100%; z-index: 30; pointer-events: none; }
.sm-scope .sm-prelayers { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; pointer-events: none; z-index: 5; }
.sm-scope .sm-prelayer { position: absolute; top: 0; left: -2px; height: 100%; width: calc(100% + 4px); }
.sm-scope .staggered-menu-panel { position: absolute; top: 0; left: -2px; width: calc(100% + 4px); height: 100%; background: #1a1a1a; display: flex; flex-direction: column; padding: 2em 1.5em; overflow-y: auto; z-index: 10; }
.sm-scope .sm-panel-inner { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1.25rem; }
.sm-scope .sm-panel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.5rem; }
.sm-scope .sm-panel-itemWrap { position: relative; overflow: hidden; line-height: 1; }
.sm-scope .sm-panel-item { background: none; border: 0; margin: 0; padding: 0.1em 0.2em 0.1em 0; text-align: left; font-family: var(--font-bebas), sans-serif; color: var(--sm-accent, #f97316); font-size: 3.5rem; letter-spacing: 0.5px; text-transform: uppercase; transition: color 0.25s ease; display: inline-flex; align-items: baseline; gap: 0.6em; white-space: nowrap; }
.sm-scope .sm-panel-itemNum { font-size: 0.45em; letter-spacing: 0; font-family: 'Inter', sans-serif; font-weight: 400; color: var(--sm-accent, #f97316); opacity: var(--sm-num-opacity, 0); }
.sm-scope .sm-panel-itemLabel { display: inline-block; will-change: transform; transform-origin: 50% 100%; white-space: nowrap; }
.sm-scope .sm-panel-item:hover { color: var(--sm-accent, #f97316); }
.sm-scope .sm-panel-item:hover .sm-panel-itemLabel { color: var(--sm-accent, #f97316); }
.sm-scope .sm-socials { margin-top: auto; padding-top: 2rem; display: flex; flex-direction: column; gap: 0.75rem; }
.sm-scope .sm-socials-title { margin: 0; font-size: 1rem; font-weight: 500; }
.sm-scope .sm-socials-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: row; align-items: center; gap: 1rem; flex-wrap: wrap; }
.sm-scope .sm-socials-link { font-size: 1.2rem; font-weight: 500; color: #ffffff; padding: 2px 0; display: inline-block; transition: color 0.3s ease, opacity 0.3s ease; }
.sm-scope .sm-socials-link:hover { color: var(--sm-accent, #f97316); }
[data-lite] .sm-prelayer, [data-lite] .staggered-menu-panel { transition: transform 0.45s cubic-bezier(0.32, 0.72, 0.32, 1), opacity 0.35s ease; }
[data-lite] .sm-panel-itemLabel { transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i, 0) * 45ms), opacity 0.4s ease calc(var(--i, 0) * 45ms); }
            `}</style>
        </div>
    )
}

export default StaggeredMenu
