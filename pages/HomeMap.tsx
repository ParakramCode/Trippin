import React, { useRef, useState, useEffect } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import JourneyMap from '../components/JourneyMap';
import Filmstrip from '../components/Filmstrip';
import { Stop } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl'; // Import mapboxgl for fitBounds
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';

const VITE_MAPBOX_TOKEN = "pk.eyJ1IjoicGFha2kyMDA2IiwiYSI6ImNta2NibDA2eDBkZ3czZHNpZnQ2OTczbGEifQ.OHSS4eEaocDhNViaJSJ41w";

const HomeMap: React.FC = () => {
    const mapRef = useRef<MapRef>(null);
    const { activeJourney } = useJourneys();
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const navigate = useNavigate();

    // Reset selected stop when journey changes
    useEffect(() => {
        if (activeJourney?.stops && activeJourney.stops.length > 0) {
            setSelectedStopId(activeJourney.stops[0].id);
            // Fit bounds to the whole journey initially
            // Note: Since JourneyMap handles the map, we might rely on its initialViewState or we could force fitBounds here if we had access to bounding box logic.
            // For now, let's just fly to the first stop or rely on default view.

            // To strictly follow "fitBounds() to show the entire new route", 
            // we would ideally calculate bounds. Simple fallback: fly to first stop.
            // Creating a BBox from coordinates:
            if (mapRef.current) {
                const bounds = new mapboxgl.LngLatBounds();
                activeJourney.stops.forEach(stop => {
                    bounds.extend(stop.coordinates as [number, number]);
                });
                mapRef.current.fitBounds(bounds, { padding: 50, duration: 2000 });
            }
        }
    }, [activeJourney]);

    const handleStopSelect = (stop: Stop) => {
        setSelectedStopId(stop.id);
        // Map flyTo is now handled by JourneyMap via useEffect
    };

    if (!activeJourney || !activeJourney.stops) {
        return (
            <div className="flex items-center justify-center h-screen bg-brand-beige">
                <div className="text-center">
                    <h2 className="text-2xl font-serif text-brand-dark mb-4">No Active Journey</h2>
                    <button
                        onClick={() => navigate('/discover')}
                        className="px-6 py-3 bg-brand-dark text-white rounded-full font-medium"
                    >
                        Discover Journeys
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-screen">
            <JourneyMap
                ref={mapRef}
                stops={activeJourney.stops}
                moments={activeJourney.moments}
                mapboxToken={VITE_MAPBOX_TOKEN}
                selectedStopId={selectedStopId}
                onStopSelect={handleStopSelect}
            />

            {/* Minimalist Floating Header */}
            <div className="absolute top-6 left-6 z-20">
                <div className="bg-white/60 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl shadow-black/5 border border-white/20">
                    <h1 className="font-serif text-xl font-bold tracking-tight text-brand-dark">{activeJourney.title}</h1>
                </div>
            </div>

            <div className="absolute top-6 right-6 z-20">
                <button className="bg-white/60 backdrop-blur-xl rounded-full w-12 h-12 flex items-center justify-center shadow-2xl shadow-black/5 border border-white/20 cursor-pointer hover:scale-105 transition-transform group">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-brand-dark group-hover:text-brand-accent transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
                    </svg>
                </button>
            </div>

            <Filmstrip
                stops={activeJourney.stops}
                selectedStopId={selectedStopId}
                onSelect={handleStopSelect}
            />
        </div>
    );
};

export default HomeMap;
