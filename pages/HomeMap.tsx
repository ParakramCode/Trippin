
import React, { useRef, useState, useEffect } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import JourneyMap from '../components/JourneyMap';
import Filmstrip from '../components/Filmstrip';
import DestinationDetail from '../components/DestinationDetail';
import { Stop, getJourneyStatus } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl'; // Import mapboxgl for fitBounds
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import NavigationDrawer from '../components/NavigationDrawer';

const VITE_MAPBOX_TOKEN = "pk.eyJ1IjoicGFha2kyMDA2IiwiYSI6ImNta2NibDA2eDBkZ3czZHNpZnQ2OTczbGEifQ.OHSS4eEaocDhNViaJSJ41w";

const HomeMap: React.FC = () => {
    const mapRef = useRef<MapRef>(null);

    /**
     * INSPECTION MODE INTEGRATION
     * 
     * Map prefers inspectionJourney (read-only) over activeJourney (mutable).
     * 
     * Journey selection hierarchy:
     * 1. inspectionJourney (if present) - Discovered journeys, read-only
     * 2. activeJourney (if present) - Forked journeys, can be mutable
     * 
     * Why:
     * - Discovered journeys must be viewable without becoming active
     * - Only forked journeys should be subject to mutations
     * - This prevents accidental corruption of journey templates
     * 
     * Behavior:
     * - Mutations (notes, visited state) only apply to activeJourney
     * - inspectionJourney is display-only, no state changes
     * - "Add to My Journeys" creates fork from inspection journey
     */

    const {
        activeJourney,
        forkJourney,
        journeyMode,
        savedJourneyIds,
        startJourney,
        // Phase 3.3: Use context-provided currentJourney and isReadOnlyJourney
        currentJourney,
        isReadOnlyJourney
    } = useJourneys();

    // Removed local currentJourney fallback - using context version
    // Removed local isReadOnlyMode - using context version

    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    // Reset selected stop when journey changes
    useEffect(() => {
        if (currentJourney?.stops && currentJourney.stops.length > 0) {
            setSelectedStopId(currentJourney.stops[0].id);
            // Fit bounds to the whole journey initially
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

    // Handler for scroll/swipe - updates camera focus ONLY
    const handleStopFocus = (stop: Stop) => {
        setSelectedStopId(stop.id);
        // Camera updates, but detail overlay does NOT open
    };

    // Handler for explicit card click - opens detail overlay ONLY
    const handleStopClick = (stop: Stop) => {
        setSelectedStop(stop);
        // Detail overlay opens, camera position unchanged
    };

    // Redirect if no journey to display
    useEffect(() => {
        if (!currentJourney || !currentJourney.stops) {
            navigate('/', { replace: true });
        }
    }, [currentJourney, navigate]);

    // Auto-expand Navigation Drawer if journey is live (and not completed)
    // NOTE: Only applies to activeJourney, not inspection mode
    useEffect(() => {
        // Phase 3.2: Auto-start navigation if journey is LIVE but not in navigation mode yet
        if (!isReadOnlyJourney && activeJourney && getJourneyStatus(activeJourney) === "LIVE" && activeJourney?.status !== 'COMPLETED' && journeyMode !== 'NAVIGATION') {
            // Journey is marked as LIVE, ensure it's in navigation mode
            startJourney(activeJourney);
        }
    }, [isReadOnlyJourney, activeJourney, journeyMode, startJourney]);

    if (!currentJourney || !currentJourney.stops) {
        return null; // Render nothing while redirecting
    }

    return (
        <div className="relative h-screen w-screen bg-slate-100 overflow-hidden">
            {/* Map component */}
            <JourneyMap
                ref={mapRef}
                stops={currentJourney.stops}
                moments={currentJourney.moments}
                mapboxToken={VITE_MAPBOX_TOKEN}
                selectedStopId={selectedStopId}
                onStopSelect={handleStopFocus}
            />

            {/* Top Right Controls: Author & Add Button */}
            {journeyMode !== 'NAVIGATION' && currentJourney && (
                <div key={currentJourney.id} className="absolute top-6 right-6 z-[100] flex flex-col items-end gap-3">
                    {/* Author Tag */}
                    {currentJourney.author && (
                        <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white/20 backdrop-blur-2xl border border-white/20 rounded-full shadow-sm">
                            <img src={currentJourney.author.avatar} alt={currentJourney.author.name} className="w-5 h-5 rounded-full object-cover border border-white/30" />
                            <span className="text-[10px] font-sans font-bold text-slate-700">Curated by @{currentJourney.author.name}</span>
                        </div>
                    )}

                    {/* Add to My Journeys Button - Only show if not already saved */}
                    {currentJourney && !savedJourneyIds.has(currentJourney.id) && (
                        <button
                            onClick={handleAddToJourneys}
                            className={`
                                px-4 py-2 rounded-full flex items-center gap-2
                                bg-white/20 backdrop-blur-2xl border border-white/20 shadow-lg 
                                hover:bg-white/30 hover:scale-105 active:scale-95 transition-all duration-200 
                                group cursor-pointer
                                ${toastMessage ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                            `}
                        >
                            {toastMessage ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-600">
                                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-700 group-hover:text-slate-900">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            )}
                            <span className={`text-[12px] font-sans font-medium ${toastMessage ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                                {toastMessage ? 'Saved' : 'Add to My Journeys'}
                            </span>
                        </button>
                    )}
                </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
                {journeyMode === 'NAVIGATION' ? (
                    <NavigationDrawer
                        key="nav-drawer"
                        stops={currentJourney.stops}
                        selectedStopId={selectedStopId}
                        onSelect={handleStopFocus}
                    />
                ) : (
                    <motion.div
                        key="filmstrip"
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
                    >
                        <div className="pointer-events-auto">
                            <Filmstrip
                                stops={currentJourney.stops}
                                selectedStopId={selectedStopId}
                                onSelect={handleStopFocus}
                                onCardClick={handleStopClick}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Destination Detail Overlay - Only opens on explicit card click */}
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
