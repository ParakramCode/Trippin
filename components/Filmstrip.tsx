
import React from 'react';
import { Stop } from '../types';

interface FilmstripProps {
    stops: Stop[];
    selectedStopId: string | null;
    onSelect: (stop: Stop) => void;
}

const Filmstrip: React.FC<FilmstripProps> = ({ stops, selectedStopId, onSelect }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleScroll = React.useCallback(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            const scrollLeft = container.scrollLeft;
            const width = container.clientWidth;

            // Debounce the selection update to prevent jumping while swiping
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                const index = Math.round(scrollLeft / width);
                if (index >= 0 && index < stops.length) {
                    const stop = stops[index];
                    if (stop && stop.id !== selectedStopId) {
                        onSelect(stop);
                    }
                }
            }, 100); // 100ms debounce
        }
    }, [stops, selectedStopId, onSelect]);

    // Effect to scroll to the selected card when map selection changes
    React.useEffect(() => {
        if (selectedStopId && containerRef.current) {
            const selectedCard = containerRef.current.querySelector(`[data-stop-id="${selectedStopId}"]`);
            if (selectedCard) {
                selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [selectedStopId]);

    return (
        <div className="fixed bottom-24 left-0 right-0 z-40 h-36 pointer-events-none flex items-center justify-center">
            {/* 
               The 'Single-Source' Strategy:
               1. Outer wrapper is fixed width (screen).
               2. Inner scroll container is w-full.
               3. Cards are w-full (minus padding).
               This forces a strict slideshow logic.
             */}
            <div
                className="w-full h-full pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide items-center touch-pan-x"
                >
                    {stops.map((stop) => (
                        <div
                            key={stop.id}
                            data-stop-id={stop.id}
                            className="snap-center flex-shrink-0 w-full h-full px-4 flex items-center justify-center" // Padding here creates the 'margin' visually
                            style={{ flex: '0 0 100%' }} // Force 100% width
                        >
                            <div
                                onClick={() => onSelect(stop)}
                                className={`
                                    w-full max-w-sm h-full bg-white/70 backdrop-blur-xl border border-white/40 rounded-[32px] shadow-xl shadow-black/5 overflow-hidden flex flex-row transition-all duration-500 ease-boutique cursor-pointer
                                    ${selectedStopId === stop.id ? 'ring-2 ring-brand-accent/50 scale-[1.02]' : 'hover:scale-[1.01]'}
                                `}
                            >
                                {/* Image (Left Side) - Fixed Aspect */}
                                <div className="w-1/3 h-full relative overflow-hidden">
                                    <img
                                        src={stop.imageUrl}
                                        alt={stop.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Content (Right Side) */}
                                <div className="w-2/3 p-4 flex flex-col justify-center text-left">
                                    <h3 className="text-brand-dark text-lg font-serif font-bold tracking-tight mb-1 truncate">
                                        {stop.name}
                                    </h3>
                                    <p className="text-slate-500 text-xs font-sans leading-relaxed line-clamp-3">
                                        {stop.description || "Explore this amazing location."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Filmstrip;
