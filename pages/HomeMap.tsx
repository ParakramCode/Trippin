
import React, { useRef, useState, useEffect } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import JourneyMap from '../components/JourneyMap';
import Filmstrip from '../components/Filmstrip';
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
    const { activeJourney, cloneToPlanner, plannerJourneys, isFollowing } = useJourneys();
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
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

    // Check for persistence
    const [isSaved, setIsSaved] = useState(false);
    useEffect(() => {
        if (activeJourney) {
            setIsSaved(plannerJourneys.some(j => j.id === activeJourney.id));
        }
    }, [activeJourney, plannerJourneys]);

    const handleAddToJourneys = () => {
        if (!activeJourney) return;
        cloneToPlanner(activeJourney);
        setToastMessage("Added to My Journeys!");
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleStopSelect = (stop: Stop) => {
        setSelectedStopId(stop.id);
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

            {/* Add to My Journeys Button - Only show if NOT in navigation mode AND NOT saved */}
            {!isFollowing && !isSaved && (
                <div className="absolute top-12 right-6 z-20">
                    <button
                        onClick={handleAddToJourneys}
                        className={`
                            bg-white/60 backdrop-blur-xl rounded-full px-5 h-12 flex items-center justify-center gap-2
                            shadow-2xl shadow-black/5 border border-white/20 cursor-pointer 
                            hover:scale-105 active:scale-95 transition-all duration-200 group
                            ${toastMessage === "Added to My Journeys!" ? 'ring-2 ring-green-500 bg-green-50' : ''}
                        `}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                            className={`w-5 h-5 text-brand-dark group-hover:text-brand-accent transition-colors ${toastMessage === "Added to My Journeys!" ? 'text-green-600' : ''}`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className={`font-medium text-sm text-brand-dark group-hover:text-brand-accent transition-colors ${toastMessage === "Added to My Journeys!" ? 'text-green-600' : ''}`}>
                            Add to My Journeys
                        </span>
                    </button>
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
        </div>
    );
};

export default HomeMap;
