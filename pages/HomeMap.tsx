
import React, { useRef, useState, useEffect } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import JourneyMap from '../components/JourneyMap';
import Filmstrip from '../components/Filmstrip';
import DestinationDetail from '../components/DestinationDetail';
import { Stop } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl'; // Import mapboxgl for fitBounds
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import NavigationDrawer from '../components/NavigationDrawer';

const VITE_MAPBOX_TOKEN = "pk.eyJ1IjoicGFha2kyMDA2IiwiYSI6ImNta2NibDA2eDBkZ3czZHNpZnQ2OTczbGEifQ.OHSS4eEaocDhNViaJSJ41w";

const HomeMap: React.FC = () => {
    const mapRef = useRef<MapRef>(null);
    const { activeJourney, cloneToPlanner, isFollowing, savedJourneyIds } = useJourneys();
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    // Reset selected stop when journey changes
    useEffect(() => {
        if (activeJourney?.stops && activeJourney.stops.length > 0) {
            setSelectedStopId(activeJourney.stops[0].id);
            // Fit bounds to the whole journey initially
            if (mapRef.current) {
                const bounds = new mapboxgl.LngLatBounds();
                activeJourney.stops.forEach(stop => {
                    bounds.extend(stop.coordinates as [number, number]);
                });
                mapRef.current.fitBounds(bounds, { padding: 50, duration: 2000 });
            }
        }
    }, [activeJourney]);

    const handleAddToJourneys = () => {
        if (!activeJourney) return;
        cloneToPlanner(activeJourney);
        setToastMessage("Added to My Journeys!");
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleStopSelect = (stop: Stop) => {
        setSelectedStopId(stop.id);
        // Open destination detail overlay
        setSelectedStop(stop);
    };

    // Redirect if no active journey
    useEffect(() => {
        if (!activeJourney || !activeJourney.stops) {
            navigate('/', { replace: true });
        }
    }, [activeJourney, navigate]);

    if (!activeJourney || !activeJourney.stops) {
        return null; // Render nothing while redirecting
    }

    return (
        <div className="relative h-screen w-screen bg-slate-100 overflow-hidden">
            {/* Map component */}
            <JourneyMap
                ref={mapRef}
                stops={activeJourney.stops}
                moments={activeJourney.moments}
                mapboxToken={VITE_MAPBOX_TOKEN}
                selectedStopId={selectedStopId}
                onStopSelect={handleStopSelect}
            />

            {/* Top Right Controls: Author & Add Button */}
            {!isFollowing && activeJourney && (
                <div key={activeJourney.id} className="absolute top-6 right-6 z-[100] flex flex-col items-end gap-3">
                    {/* Author Tag */}
                    {activeJourney.author && (
                        <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white/20 backdrop-blur-2xl border border-white/20 rounded-full shadow-sm">
                            <img src={activeJourney.author.avatar} alt={activeJourney.author.name} className="w-5 h-5 rounded-full object-cover border border-white/30" />
                            <span className="text-[10px] font-sans font-bold text-slate-700">Curated by @{activeJourney.author.name}</span>
                        </div>
                    )}

                    {/* Add to My Journeys Button - Only show if not already saved */}
                    {activeJourney && !savedJourneyIds.has(activeJourney.id) && (
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
                {isFollowing ? (
                    <NavigationDrawer
                        key="nav-drawer"
                        stops={activeJourney.stops}
                        selectedStopId={selectedStopId}
                        onSelect={handleStopSelect}
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
                                stops={activeJourney.stops}
                                selectedStopId={selectedStopId}
                                onSelect={handleStopSelect}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Destination Detail Overlay */}
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
