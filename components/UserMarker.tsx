
import React from 'react';
import { Marker } from 'react-map-gl/mapbox';

interface UserMarkerProps {
    latitude: number;
    longitude: number;
    heading: number | null;
}

const UserMarker: React.FC<UserMarkerProps> = ({ latitude, longitude, heading }) => {
    return (
        <Marker
            longitude={longitude}
            latitude={latitude}
            anchor="center"
        >
            <div className="relative flex items-center justify-center w-12 h-12 transition-all duration-1000 ease-linear">
                {/* Heading Cone/Arrow */}
                {heading !== null && (
                    <div
                        className="absolute w-24 h-24 bg-gradient-to-t from-blue-500/20 to-transparent rounded-full -z-10"
                        style={{
                            transform: `rotate(${heading}deg)`,
                            // This gradient cone is a bit simplified; typically a sector.
                            // Let's use a simple arrow icon instead for clarity as "arrow" was requested.
                        }}
                    />
                )}
                {/* Heading Arrow Wrapper */}
                <div
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
                    style={{ transform: `rotate(${heading || 0}deg)` }}
                >
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-600 mb-8" />
                </div>

                {/* Puck (Blue Dot) */}
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md z-10 box-content ring-1 ring-blue-500/30 ring-offset-1" />

                {/* Pulse Ripple */}
                <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping opacity-75" />
            </div>
        </Marker>
    );
};

export default UserMarker;
