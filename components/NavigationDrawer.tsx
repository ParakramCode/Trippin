
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stop, getJourneyStatus } from '../types';
import { useJourneys } from '../context/JourneyContext';
import { getDistanceFromLatLonInKm, checkProximity } from '../utils/geometry';

interface NavigationDrawerProps {
    stops: readonly Stop[];
    selectedStopId: string | null;
    onSelect: (stop: Stop) => void;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ stops, selectedStopId, onSelect }) => {
    /**
     * COMPONENT MIGRATION: Per-Journey Visited State
     * 
     * BEFORE (Global state):
     * - visitedStopIds: string[] - Global array affecting all journeys
     * - toggleStopVisited(stopId) - Mutates global state
     * 
     * AFTER (Journey-scoped state):
     * - toggleStopVisitedInJourney(journeyId, stopId) - Scoped to journey
     * - stop.visited - Direct property access
     * 
     * Benefits:
     * - Independent progress per fork
     * - No cross-journey pollution
     * - Aligns with JourneyFork domain model
     */
    const {
        userLocation,
        stopJourney,  // Phase 3.2: Using stopJourney instead of setIsFollowing
        activeJourney,
        completeJourney,
        // NEW: Journey-scoped visited state
        toggleStopVisitedInJourney
    } = useJourneys();

    const [isOpen, setIsOpen] = useState(true);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [lastToggleTime, setLastToggleTime] = useState(0);

    // Calculate stops remaining using journey-scoped visited state
    const totalStops = stops.length;
    // MIGRATED: Use stop.visited (per-journey) instead of global visitedStopIds
    const visitedCount = stops.filter(s => s.visited === true).length;
    const stopsRemaining = totalStops - visitedCount;

    // Determine the closest stop to highlight
    let closestStopIndex = -1;
    if (userLocation) {
        const stopCoords = stops.map(s => s.coordinates);
        closestStopIndex = checkProximity(userLocation[1], userLocation[0], stopCoords as [number, number][]);
    }

    const toggleDrawer = () => setIsOpen(!isOpen);

    const handleDragEnd = (_: any, info: any) => {
        // Swipe left to close, right to open
        if (info.offset.x < -50 && isOpen) {
            setIsOpen(false);
        } else if (info.offset.x > 50 && !isOpen) {
            setIsOpen(true);
        }
    };

    const handleStopClick = (stop: Stop, e: React.MouseEvent) => {
        e.stopPropagation();

        // Prevent double-click issues
        const now = Date.now();
        if (now - lastToggleTime < 300) return;
        setLastToggleTime(now);

        // MIGRATED: Use journey-scoped toggle instead of global
        // Only toggle if we have an activeJourney (not in inspection mode)
        if (!activeJourney) return;

        toggleStopVisitedInJourney(activeJourney, stop.id);

        // Check if this completes the journey  
        // Use stop.visited (will be toggled) to determine new state
        const willBeVisited = !stop.visited;
        if (willBeVisited) {
            const newVisitedCount = visitedCount + 1;
            if (newVisitedCount === totalStops) {
                // Show completion modal after a brief delay
                setTimeout(() => setShowCompletionModal(true), 500);
            }
        }
    };

    const handleMarkComplete = () => {
        // Mark journey as completed with timestamp
        if (activeJourney) {
            completeJourney(activeJourney);
        }
        setShowCompletionModal(false);

        // Navigate to My Trips to see completed journey
        // Using setTimeout to allow state to update
        setTimeout(() => {
            window.location.href = '/my-trips';
        }, 300);
    };

    return (
        <>
            <motion.div
                drag="x"
                dragConstraints={{ left: -310, right: 0 }}
                dragElastic={0.05}
                onDragEnd={handleDragEnd}
                initial={{ x: 0 }} // Start Open
                animate={{ x: isOpen ? 0 : -310 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-0 left-0 bottom-0 w-80 bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-2xl z-30 flex flex-col"
            >
                {/* The Pull-Tab Component - Edge Handle */}
                <div
                    onClick={toggleDrawer}
                    className="absolute top-0 bottom-0 right-0 w-8 pr-1 flex items-center justify-end cursor-pointer group z-50 touch-manipulation"
                >
                    <div className="w-1 h-16 bg-slate-400/50 rounded-full group-hover:bg-slate-500/70 transition-colors backdrop-blur-md shadow-sm" />
                </div>

                {/* Header with Recording Status */}
                <div className="p-6 border-b border-slate-100/50 flex flex-col gap-2 select-none">
                    {/* Recording indicator for forked/cloned journeys */}
                    {activeJourney?.sourceJourneyId && getJourneyStatus(activeJourney) === "LIVE" && (
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-sans font-medium text-slate-500">
                                Following {activeJourney.title} • Recording your journey
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-widest uppercase text-indigo-500">Live Navigation</span>
                        {stopsRemaining > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2.5 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold"
                            >
                                {stopsRemaining} {stopsRemaining === 1 ? 'stop' : 'stops'} left
                            </motion.div>
                        )}
                        {stopsRemaining === 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2.5 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold"
                            >
                                ✓ Complete
                            </motion.div>
                        )}
                    </div>
                    <h2 className="text-2xl font-sans font-bold text-slate-800">Your Route</h2>
                </div>

                {/* Stops List */}
                <div className={`flex-1 overflow-y-auto px-6 py-4 space-y-0 relative select-none transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-30'}`}>
                    {/* Vertical Line Connector */}
                    <div className="absolute left-[39px] top-8 bottom-8 w-0.5 border-l-2 border-dashed border-slate-300 z-0" />

                    {stops.map((stop, index) => {
                        const isSelected = selectedStopId === stop.id;
                        const isClosest = closestStopIndex === index;
                        // MIGRATED: Use stop.visited (per-journey) instead of global visitedStopIds
                        const isVisited = stop.visited === true;

                        // Calculate distance if user location is available
                        let distanceText = '-- km';
                        if (userLocation) {
                            const dist = getDistanceFromLatLonInKm(userLocation[1], userLocation[0], stop.coordinates[1], stop.coordinates[0]);
                            // Show "Arrived" if very close
                            if (dist < 0.05) distanceText = 'Arrived';
                            else distanceText = `${dist.toFixed(1)} km`;
                        }

                        return (
                            <div
                                key={stop.id}
                                onClick={(e) => handleStopClick(stop, e)}
                                className={`relative z-10 flex items-center gap-4 py-4 cursor-pointer group transition-all duration-300 
                                    ${isClosest ? 'opacity-100' : isVisited ? 'opacity-50' : 'opacity-80'}
                                    hover:bg-slate-50/50 rounded-xl px-2 -mx-2
                                `}
                            >
                                {/* Visual Bullet / Thumbnail */}
                                <div className={`
                                    w-8 h-8 rounded-full border-2 flex-shrink-0 overflow-hidden bg-white shadow-sm transition-all duration-300 flex items-center justify-center
                                    ${isClosest ? 'border-indigo-500 scale-125 ring-2 ring-indigo-500/20 shadow-indigo-500/30' :
                                        isVisited ? 'border-emerald-500 bg-emerald-500' :
                                            'border-white group-hover:border-slate-300'}
                                `}>
                                    {isVisited ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                            <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <img src={stop.imageUrl} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 min-w-0 transition-transform duration-300 ${isClosest ? 'translate-x-1' : ''}`}>
                                    <h3 className={`font-sans text-lg leading-tight truncate transition-colors 
                                        ${isClosest ? 'text-indigo-600 font-bold' : isVisited ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}
                                    `}>
                                        {stop.name}
                                    </h3>
                                    <div className="flex items-center justify-between mt-0.5 pr-2">
                                        <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm
                                            ${isClosest ? 'bg-indigo-100 text-indigo-600' : isVisited ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}
                                        `}>
                                            {isVisited ? 'VISITED' : `STOP ${index + 1}`}
                                        </span>
                                        <span className={`text-xs font-mono ml-2 ${isClosest ? 'text-indigo-500 font-bold' : 'text-slate-500'}`}>
                                            {distanceText}
                                        </span>
                                    </div>
                                </div>

                                {/* Active Indicator Dot on the right */}
                                {isClosest && !isVisited && (
                                    <div className="absolute right-0 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer / Exit Action */}
                <div className="p-6 border-t border-slate-100/50 bg-white/50 backdrop-blur-sm">
                    <button
                        onClick={() => activeJourney && stopJourney(activeJourney)}
                        className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform">
                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                        End Navigation
                    </button>
                </div>
            </motion.div>

            {/* Completion Celebration Overlay */}
            <AnimatePresence>
                {showCompletionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowCompletionModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="text-6xl mb-4"
                            >
                                🎉
                            </motion.div>
                            <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">
                                Trip Completed!
                            </h2>
                            <p className="text-slate-600 mb-6">
                                You've visited all {totalStops} stops on this journey. Ready to mark it as complete?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCompletionModal(false)}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                                >
                                    Not Yet
                                </button>
                                <button
                                    onClick={handleMarkComplete}
                                    className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/30"
                                >
                                    Mark Complete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default NavigationDrawer;
