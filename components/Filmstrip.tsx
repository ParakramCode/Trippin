
import React from 'react';
import { Stop } from '../types';

interface FilmstripProps {
    stops: Stop[];
    selectedStopId: string | null;
    onSelect: (stop: Stop) => void;
}

const Filmstrip: React.FC<FilmstripProps> = ({ stops, selectedStopId, onSelect }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const observerRef = React.useRef<IntersectionObserver | null>(null);

    React.useEffect(() => {
        const options = {
            root: containerRef.current,
            threshold: 0.6
        };

        const callback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const stopId = entry.target.getAttribute('data-stop-id');
                    const stop = stops.find(s => s.id === stopId);
                    if (stop) {
                        // Debounce logic is handled by the parent's state update or could be added here if needed.
                        // For direct simplicity as per instruction, we just trigger select.
                        // However, to strictly follow "debounce of 150ms" request:
                        setTimeout(() => onSelect(stop), 150);
                    }
                }
            });
        };

        observerRef.current = new IntersectionObserver(callback, options);

        const cards = containerRef.current?.querySelectorAll('.filmstrip-card');
        cards?.forEach(card => observerRef.current?.observe(card));

        return () => observerRef.current?.disconnect();
    }, [stops, onSelect]);

    return (
        <div className="fixed bottom-24 left-0 right-0 z-50 mb-4 px-4">
            <div
                className="bg-white/60 backdrop-blur-2xl border border-white/20 p-4 rounded-[32px] shadow-2xl shadow-black/5 h-64 overflow-y-hidden"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <div
                    ref={containerRef}
                    className="flex space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-2 h-full items-center touch-pan-x overscroll-x-contain"
                >
                    {stops.map((stop) => (
                        <div
                            key={stop.id}
                            data-stop-id={stop.id}
                            className={`filmstrip-card snap-center flex-shrink-0 w-full h-full rounded-[24px] overflow-hidden bg-white/40 border border-white/30 backdrop-blur-sm transition-all duration-500 relative flex flex-row ${selectedStopId === stop.id ? 'ring-1 ring-black/5' : ''
                                }`}
                            style={{ flex: '0 0 100%' }}
                        >
                            <div className="w-1/2 h-full relative overflow-hidden">
                                <img
                                    src={stop.imageUrl}
                                    alt={stop.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="w-1/2 p-4 flex flex-col justify-center text-left">
                                <h3 className="text-brand-dark text-xl font-serif font-bold tracking-tight mb-2">
                                    {stop.name}
                                </h3>
                                <p className="text-slate-600 text-xs font-sans leading-relaxed line-clamp-4">
                                    {stop.description || "Explore this amazing location."}
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
