import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stop } from '../types';
import { useJourneys } from '../context/JourneyContext';
import { getDistanceFromLatLonInKm } from '../utils/geometry';
import GlassCard from './GlassCard';

interface NextStopFloatProps {
    stops: readonly Stop[];
    onExpand: () => void;
    isExpanded: boolean;
}

/**
 * Next Stop Float Component
 * 
 * Glassmorphic floating card with slate gray typography for maximum readability.
 * All text elements use slate-700 (#334155) for clear contrast on white/50 background.
 */
const NextStopFloat: React.FC<NextStopFloatProps> = ({ stops, onExpand, isExpanded }) => {
    const { activeJourney, markStopVisitedInJourney, userLocation, stopJourney } = useJourneys();

    // Find the first non-visited stop
    const nextStop = stops.find(stop => !stop.visited);

    if (!nextStop || !activeJourney) {
        return null;
    }

    // Calculate distance if user location is available
    let distanceText = '-- km';
    let isNearby = false;
    if (userLocation) {
        const dist = getDistanceFromLatLonInKm(
            userLocation[1],
            userLocation[0],
            nextStop.coordinates[1],
            nextStop.coordinates[0]
        );
        isNearby = dist < 0.05; // Within 50 meters
        if (isNearby) {
            distanceText = 'You\'re here!';
        } else {
            distanceText = `${dist.toFixed(1)} km away`;
        }
    }

    const handleArrived = () => {
        if (activeJourney) {
            markStopVisitedInJourney(activeJourney, nextStop.id);
        }
    };

    const handleEndNavigation = () => {
        if (activeJourney) {
            stopJourney(activeJourney);
        }
    };

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-6 left-6 right-6 z-[100]"
        >
            <GlassCard className="rounded-2xl overflow-hidden">
                {/* Header with End Navigation button */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-200/40">
                    <p className="text-[10px] font-sans font-bold tracking-wider uppercase text-slate-700">
                        Next Stop
                    </p>
                    <button
                        onClick={handleEndNavigation}
                        className="px-3 py-1.5 bg-red-100/80 hover:bg-red-200/80 border border-red-300/60 rounded-full flex items-center gap-1.5 transition-colors group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-red-600">
                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-sans font-bold text-red-700">End</span>
                    </button>
                </div>

                {/* Main content */}
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        {/* Stop thumbnail with dark overlay for depth */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-300/50 shadow-md relative">
                            <img
                                src={nextStop.imageUrl}
                                alt={nextStop.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Subtle dark gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
                        </div>

                        {/* Stop info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-sans font-bold text-slate-700 leading-tight mb-1 truncate">
                                        {nextStop.name}
                                    </h3>
                                    <p className="text-xs font-mono text-slate-700">
                                        {distanceText}
                                    </p>
                                </div>

                                {/* Arrived button with slate theme */}
                                {isNearby && (
                                    <motion.button
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleArrived}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-700 rounded-full font-sans font-semibold text-sm shadow-lg shadow-emerald-500/30 transition-colors flex-shrink-0"
                                    >
                                        ✓ Arrived
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expand handle */}
                <button
                    onClick={onExpand}
                    className="w-full py-2 border-t border-slate-200/40 bg-slate-100/30 hover:bg-slate-100/50 transition-colors flex items-center justify-center gap-2 group"
                >
                    <span className="text-xs font-sans font-medium text-slate-700">
                        {isExpanded ? 'Hide Route' : 'Your Route'}
                    </span>
                    <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 text-slate-700"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                    </motion.svg>
                </button>
            </GlassCard>

            {/* Expanded route list */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <GlassCard className="rounded-2xl mt-2 overflow-hidden">
                            <div className="max-h-96 overflow-y-auto scrollbar-hide">
                                {stops.map((stop, index) => (
                                    <div
                                        key={stop.id}
                                        className={`
                      px-4 py-3 border-b border-slate-200/40 last:border-0
                      ${stop.visited ? 'opacity-60' : 'opacity-100'}
                    `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`
                        w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                        ${stop.visited
                                                    ? 'bg-emerald-500 border-2 border-emerald-400'
                                                    : 'bg-slate-200 border-2 border-slate-300'
                                                }
                      `}>
                                                {stop.visited ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-700">{index + 1}</span>
                                                )}
                                            </div>
                                            <p className={`
                        text-sm font-sans font-medium flex-1
                        ${stop.visited ? 'text-slate-500 line-through' : 'text-slate-700'}
                      `}>
                                                {stop.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default NextStopFloat;
