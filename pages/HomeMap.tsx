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

    const handleCloneClick = () => {
        if (!activeJourney) return;

        // Check if THIS specific journey instance is already in the planner
        const alreadyInPlanner = plannerJourneys.some(j => j.id === activeJourney.id);

        if (alreadyInPlanner) {
            setToastMessage("Already in Planner");
            setTimeout(() => setToastMessage(null), 2000);
            return;
        }

        // Clone it
        cloneToPlanner(activeJourney);
        setToastMessage("Trip Cloned to Planner!");
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

            {/* Copy/Clone Button - Only show if NOT in navigation mode */}
            {!isFollowing && (
                <div className="absolute top-12 right-6 z-20">
                    <button
                        onClick={handleCloneClick}
                        className={`
                            bg-white/60 backdrop-blur-xl rounded-full w-12 h-12 flex items-center justify-center 
                            shadow-2xl shadow-black/5 border border-white/20 cursor-pointer 
                            hover:scale-105 active:scale-95 transition-all duration-200 group
                            ${toastMessage === "Trip Cloned to Planner!" ? 'ring-2 ring-green-500 bg-green-50' : ''}
                        `}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                            className={`w-5 h-5 text-brand-dark group-hover:text-brand-accent transition-colors ${toastMessage === "Trip Cloned to Planner!" ? 'text-green-600' : ''}`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
                        </svg>
                    </button>
                </div>
            )}

            <AnimatePresence mode="wait">
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
