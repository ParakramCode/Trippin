
import React from 'react';
import { motion } from 'framer-motion';
import { Stop } from '../types';
import { useJourneys } from '../context/JourneyContext';
import { getDistanceFromLatLonInKm, checkProximity } from '../utils/geometry';

interface NavigationDrawerProps {
    stops: Stop[];
    selectedStopId: string | null;
    onSelect: (stop: Stop) => void;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ stops, selectedStopId, onSelect }) => {
    const { userLocation, setIsFollowing, visitedStopIds } = useJourneys();

    // Determine the closest stop to highlight
    let closestStopIndex = -1;
    if (userLocation) {
        const stopCoords = stops.map(s => s.coordinates);
        closestStopIndex = checkProximity(userLocation[1], userLocation[0], stopCoords as [number, number][]);
    }

    return (
        <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 bottom-0 w-80 bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-2xl z-30 flex flex-col"
        >
            {/* Header */}
            <div className="p-6 border-b border-slate-100/50 flex flex-col gap-1">
                <span className="text-xs font-bold tracking-widest uppercase text-indigo-500">Live Navigation</span>
                <h2 className="text-2xl font-serif text-slate-800">Your Route</h2>
            </div>

            {/* Stops List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0 relative">
                {/* Vertical Line Connector */}
                <div className="absolute left-[39px] top-8 bottom-8 w-0.5 border-l-2 border-dashed border-slate-300 z-0" />

                {stops.map((stop, index) => {
                    const isSelected = selectedStopId === stop.id;
                    const isClosest = closestStopIndex === index;
                    const isVisited = visitedStopIds.includes(stop.id);

                    // Logic: Visited trumps Closest. If Visited, show Check. If Closest, show Pulse/Active.

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
                            onClick={() => onSelect(stop)}
                            className={`relative z-10 flex items-center gap-4 py-4 cursor-pointer group transition-all duration-300 
                                ${isClosest ? 'opacity-100' : isVisited ? 'opacity-50' : 'opacity-80'}
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
                                <h3 className={`font-serif text-lg leading-tight truncate transition-colors 
                                    ${isClosest ? 'text-indigo-600 font-bold' : isVisited ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}
                                `}>
                                    {stop.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm
                                        ${isClosest ? 'bg-indigo-100 text-indigo-600' : isVisited ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}
                                    `}>
                                        {isVisited ? 'VISITED' : `STOP ${index + 1}`}
                                    </span>
                                    <span className={`text-xs font-mono ${isClosest ? 'text-indigo-500 font-bold' : 'text-slate-500'}`}>
                                        {distanceText}
                                    </span>
                                </div>
                            </div>

                            {/* Active Indicator Dot on the right */}
                            {isClosest && !isVisited && (
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse mr-2" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer / Exit Action */}
            <div className="p-6 border-t border-slate-100/50 bg-white/50 backdrop-blur-sm">
                <button
                    onClick={() => setIsFollowing(false)}
                    className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 group-hover:scale-110 transition-transform">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                    End Navigation
                </button>
            </div>
        </motion.div>
    );
};

export default NavigationDrawer;
