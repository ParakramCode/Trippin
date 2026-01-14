
import React, { useRef, useState } from 'react';
import { MapRef } from 'react-map-gl/mapbox';
import JourneyMap from '../components/JourneyMap';
import Filmstrip from '../components/Filmstrip';
import { Stop } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';

const VITE_MAPBOX_TOKEN = "pk.eyJ1IjoicGFha2kyMDA2IiwiYSI6ImNta2NibDA2eDBkZ3czZHNpZnQ2OTczbGEifQ.OHSS4eEaocDhNViaJSJ41w";

// Mock Data
const STOPS: Stop[] = [
  { id: '1', name: 'San Francisco', coordinates: [-122.4194, 37.7749], imageUrl: 'https://picsum.photos/seed/sf/300/200', description: 'Iconic city by the bay featuring the Golden Gate Bridge.' },
  { id: '2', name: 'Sausalito', coordinates: [-122.4853, 37.8591], imageUrl: 'https://picsum.photos/seed/sau/300/200', description: 'Charming seaside town with stunning skyline views.' },
  { id: '3', name: 'Muir Woods', coordinates: [-122.5811, 37.8970], imageUrl: 'https://picsum.photos/seed/muir/300/200', description: 'Ancient redwood forest offering peaceful hiking trails.' },
  { id: '4', name: 'Stinson Beach', coordinates: [-122.6445, 37.9005], imageUrl: 'https://picsum.photos/seed/stinson/300/200', description: 'Popular white sand beach perfect for a relaxing day trip.' },
  { id: '5', name: 'Point Reyes', coordinates: [-122.8817, 38.0049], imageUrl: 'https://picsum.photos/seed/reyes/300/200', description: 'Dramatic coastline with a historic lighthouse and wildlife.' },
];



const Discover: React.FC = () => {
  const mapRef = useRef<MapRef>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const handleStopSelect = (stop: Stop) => {
    setSelectedStopId(stop.id);
    mapRef.current?.flyTo({
      center: stop.coordinates,
      zoom: 13.5,
      speed: 1.0,
      pitch: 50,
      padding: { top: 0, bottom: 300, left: 0, right: 0 }, // Offset map to frame the road segment above the filmstrip
      curve: 1.5
    });
  };

  return (
    <div className="relative h-screen w-screen">
      <JourneyMap
        ref={mapRef}
        stops={STOPS}
        mapboxToken={VITE_MAPBOX_TOKEN}
      />
      {/* Minimalist Floating Header */}
      <div className="absolute top-6 left-6 z-20">
        <div className="bg-white/60 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl shadow-black/5 border border-white/20">
          <h1 className="font-serif text-xl font-bold tracking-tight text-brand-dark">Trippin</h1>
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
        stops={STOPS}
        selectedStopId={selectedStopId}
        onSelect={handleStopSelect}
      />
    </div>
  );
};

export default Discover;
