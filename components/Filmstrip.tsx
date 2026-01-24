
import React from 'react';
import { Stop } from '../types';

interface FilmstripProps {
    stops: readonly Stop[];
    selectedStopId: string | null;
    onSelect: (stop: Stop) => void; // Camera focus during scroll
    onCardClick?: (stop: Stop) => void; // Explicit click for detail overlay
}

const Filmstrip: React.FC<FilmstripProps> = ({ stops, selectedStopId, onSelect, onCardClick }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isScrollingRef = React.useRef<boolean>(false);

    const handleScroll = React.useCallback(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            const scrollLeft = container.scrollLeft;
            const width = container.clientWidth;

            // Mark as scrolling to prevent auto-opening detail
            isScrollingRef.current = true;

            // Debounce the selection update to prevent jumping while swiping
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                const index = Math.round(scrollLeft / width);
                if (index >= 0 && index < stops.length) {
                    const stop = stops[index];
                    if (stop && stop.id !== selectedStopId) {
                        onSelect(stop); // Only updates camera, NOT detail overlay
                    }
                }
                // Clear scrolling flag after debounce
                setTimeout(() => {
                    isScrollingRef.current = false;
                }, 200);
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

    const handleCardClick = (stop: Stop, e: React.MouseEvent) => {
        // Prevent event bubbling to map
        e.stopPropagation();

        // Only trigger detail overlay if not currently scrolling
        if (!isScrollingRef.current && onCardClick) {
            onCardClick(stop);
        }
    };

    // Show empty state if no stops
    if (stops.length === 0) {
        return (
            <div className="fixed bottom-24 left-0 right-0 z-40 h-36 flex items-center justify-center px-4">
                <div className="w-full max-w-sm h-full bg-gradient-to-br from-white/80 via-indigo-50/80 to-purple-50/80 backdrop-blur-xl border-2 border-dashed border-indigo-300/50 rounded-[32px] shadow-2xl flex items-center justify-center">
                    <div className="text-center px-6">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-3 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-slate-800 text-lg font-serif font-bold mb-1">
                            Add your first stop
                        </h3>
                        <p className="text-slate-500 text-xs font-sans leading-relaxed">
                            Tap anywhere on the map to begin
                        </p>
                    </div>
                </div>
            </div>
        );
    }

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
                                onClick={(e) => handleCardClick(stop, e)}
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
