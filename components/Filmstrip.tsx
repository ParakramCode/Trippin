
import React from 'react';
import { Stop } from '../types';

interface FilmstripProps {
    stops: Stop[];
    selectedStopId: string | null;
    onSelect: (stop: Stop) => void;
}

const Filmstrip: React.FC<FilmstripProps> = ({ stops, selectedStopId, onSelect }) => {
    return (
        <div className="absolute bottom-32 left-4 right-4 z-10 pb-4">
            <div className="bg-white/60 backdrop-blur-2xl border border-white/20 p-4 rounded-[32px] shadow-2xl shadow-black/5">
                <div className="flex space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-2">
                    {stops.map((stop) => (
                        <div
                            key={stop.id}
                            onClick={() => onSelect(stop)}
                            className={`snap-center flex-shrink-0 w-48 rounded-[24px] overflow-hidden cursor-pointer transition-all duration-500 group relative ${selectedStopId === stop.id
                                ? 'scale-[1.02] shadow-xl ring-1 ring-black/5'
                                : 'hover:scale-[1.02] hover:shadow-lg'
                                }`}
                        >
                            <div className="h-32 w-full relative overflow-hidden">
                                <img
                                    src={stop.imageUrl}
                                    alt={stop.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </div>

                            {/* Metadata Footer */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                                <h3 className="text-white text-lg font-serif font-bold tracking-tight drop-shadow-sm truncate">
                                    {stop.name}
                                </h3>
                                <p className="text-white/80 text-[10px] uppercase tracking-widest font-medium mt-0.5">
                                    {stop.coordinates[1].toFixed(2)}°N
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Filmstrip;
