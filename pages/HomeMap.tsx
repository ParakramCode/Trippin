import React, { useRef, useState, useEffect } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import JourneyMap from '../components/JourneyMap';
import Filmstrip from '../components/Filmstrip';
import DestinationDetail from '../components/DestinationDetail';
import NextStopFloat from '../components/NextStopFloat';
import PersonalizationPill from '../components/PersonalizationPill';
import { Stop } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from "react-dom";


const VITE_MAPBOX_TOKEN = "pk.eyJ1IjoicGFha2kyMDA2IiwiYSI6ImNta2NibDA2eDBkZ3czZHNpZnQ2OTczbGEifQ.OHSS4eEaocDhNViaJSJ41w";

const HomeMap: React.FC = () => {
    const mapRef = useRef<MapRef>(null);
    const navigate = useNavigate();

    const {
        activeJourney,
        forkJourney,
        journeyMode,
        savedJourneyIds,
        startJourney,
        currentJourney,
        isReadOnlyJourney,
        stopJourney,
    } = useJourneys();

    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isRouteExpanded, setIsRouteExpanded] = useState<boolean>(false);

    // Portal root management - create overlay-root if it doesn't exist
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        let root = document.getElementById("overlay-root");
        if (!root) {
            root = document.createElement("div");
            root.id = "overlay-root";
            document.body.appendChild(root);
        }
        setPortalRoot(root);

        return () => {
            // Cleanup: remove the portal root when component unmounts
            if (root && root.parentNode === document.body) {
                document.body.removeChild(root);
            }
        };
    }, []);

    // Reset selected stop when journey changes
    useEffect(() => {
        if (currentJourney?.stops && currentJourney.stops.length > 0) {
            setSelectedStopId(currentJourney.stops[0].id);
            if (mapRef.current) {
                const bounds = new mapboxgl.LngLatBounds();
                currentJourney.stops.forEach(stop => {
                    bounds.extend(stop.coordinates as [number, number]);
                });
                mapRef.current.fitBounds(bounds, { padding: 50, duration: 2000 });
            }
        }
    }, [currentJourney]);

    const handleAddToJourneys = () => {
        if (!currentJourney) return;
        forkJourney(currentJourney);
        setToastMessage("Added to My Journeys!");
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleExitLiveNavigation = () => {
        // Exit live navigation by stopping the journey
        // This transitions journeyMode away from NAVIGATION
        // BottomNav will reappear automatically via derived state in App.tsx
        if (activeJourney) {
            stopJourney(activeJourney);
        }
        navigate(-1);
    };

    const handleStopFocus = (stop: Stop) => {
        setSelectedStopId(stop.id);
    };

    const handleStopClick = (stop: Stop) => {
        setSelectedStop(stop);
    };

    // Redirect if no journey to display
    useEffect(() => {
        if (!currentJourney || !currentJourney.stops) {
            navigate('/', { replace: true });
        }
    }, [currentJourney, navigate]);

    // Auto-start navigation for live journeys
    useEffect(() => {
        if (!isReadOnlyJourney && activeJourney && activeJourney.status === "LIVE" && journeyMode !== 'NAVIGATION') {
            startJourney(activeJourney);
        }
    }, [isReadOnlyJourney, activeJourney, journeyMode, startJourney]);

    if (!currentJourney || !currentJourney.stops) {
        return null;
    }

    return (
        /* 
          ScreenRoot: position relative, height 100vh
          Top-level container for entire Live Journey screen
        */
        <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>

            {/* 
              MapLayer: position absolute; top 0; left 0; right 0; bottom 0
              Fills entire screen, renders behind everything
            */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
                <JourneyMap
                    ref={mapRef}
                    stops={currentJourney.stops}
                    moments={currentJourney.moments}
                    mapboxToken={VITE_MAPBOX_TOKEN}
                    selectedStopId={selectedStopId}
                    onStopSelect={handleStopFocus}
                />
            </div>

            {/* 
              Minimalist Back Button
              Only shown in NAVIGATION mode - exits live navigation
            */}
            {journeyMode === 'NAVIGATION' && (
                <button
                    onClick={handleExitLiveNavigation}
                    className="absolute top-6 left-6 z-[1001] p-2 text-slate-700/80 hover:text-slate-900 transition-colors rounded-full hover:bg-white/20 backdrop-blur-sm"
                    aria-label="Exit navigation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
            )}

            {/* 
              NextStopCard: position absolute; top env(safe-area-inset-top)
              Only shown in NAVIGATION mode
            */}
            {journeyMode === 'NAVIGATION' && (
                <NextStopFloat
                    stops={currentJourney.stops}
                    onExpand={() => setIsRouteExpanded(!isRouteExpanded)}
                    isExpanded={isRouteExpanded}
                />
            )}

            {/* 
              BottomActionBar: position fixed
              Only shown in NAVIGATION mode
              Completely independent of parent containers
              Rendered via portal to overlay-root
            */}
            {journeyMode === 'NAVIGATION' && portalRoot && createPortal(
                <PersonalizationPill />,
                portalRoot
            )}


            {/* 
              Filmstrip: Shown when NOT in navigation mode
            */}
            {journeyMode !== 'NAVIGATION' && (
                <motion.div
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 200, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'none' }}
                >
                    <div style={{ pointerEvents: 'auto' }}>
                        <Filmstrip
                            stops={currentJourney.stops}
                            selectedStopId={selectedStopId}
                            onSelect={handleStopFocus}
                            onCardClick={handleStopClick}
                        />
                    </div>
                </motion.div>
            )}

            {/* 
              Top Right Controls: Author & Add Button
              Only shown when NOT in navigation mode
            */}
            {journeyMode !== 'NAVIGATION' && currentJourney && (
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    {currentJourney.author && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.25rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '9999px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <img src={currentJourney.author.avatar} alt={currentJourney.author.name} style={{ width: '1.25rem', height: '1.25rem', borderRadius: '9999px', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.3)' }} />
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#334155' }}>Curated by @{currentJourney.author.name}</span>
                        </div>
                    )}

                    {currentJourney && !savedJourneyIds.has(currentJourney.id) && (
                        <button
                            onClick={handleAddToJourneys}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '9999px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor: toastMessage ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: toastMessage ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = toastMessage ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.2)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            {toastMessage ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1rem', height: '1rem', color: '#059669' }}>
                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1rem', height: '1rem', color: '#334155' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            )}
                            <span style={{ fontSize: '0.75rem', fontWeight: toastMessage ? 700 : 500, color: toastMessage ? '#047857' : '#334155' }}>
                                {toastMessage ? 'Saved' : 'Add to My Journeys'}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* 
              Destination Detail Overlay
              Shown when user explicitly clicks a card
            */}
            <AnimatePresence>
                {selectedStop && (
                    <DestinationDetail
                        stop={selectedStop}
                        onClose={() => setSelectedStop(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default HomeMap;
