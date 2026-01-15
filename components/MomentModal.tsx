import React, { useRef, useState, useEffect } from 'react';
import { Moment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MomentModalProps {
    isOpen: boolean;
    onClose: () => void;
    moments: Moment[];
    initialIndex?: number;
}

const MomentModal: React.FC<MomentModalProps> = ({ isOpen, onClose, moments, initialIndex = 0 }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    // Sync active index when initialIndex changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveIndex(initialIndex);
            if (scrollRef.current) {
                const width = scrollRef.current.clientWidth;
                scrollRef.current.scrollTo({ left: width * initialIndex, behavior: 'instant' });
            }
        }
    }, [isOpen, initialIndex]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const width = e.currentTarget.clientWidth;
        const newIndex = Math.round(e.currentTarget.scrollLeft / width);
        setActiveIndex(newIndex);
    };

    return (
        <AnimatePresence>
            {isOpen && moments.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Editorial Postcard Frame */}
                    <motion.div
                        className="relative max-w-sm w-full aspect-[3/5] md:aspect-[4/5] rounded-[24px] shadow-2xl overflow-hidden bg-white z-10 flex flex-col"
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => { e.stopPropagation(); }}
                    >
                        {/* Close Button (Glassmorphic) */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-30 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white rounded-full p-2 transition-all duration-200 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Swipeable Container */}
                        <div
                            ref={scrollRef}
                            className="flex-1 flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                            style={{ scrollBehavior: 'smooth' }}
                            onScroll={handleScroll}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {moments.map((moment) => (
                                <div
                                    key={moment.id}
                                    className="snap-center w-full h-full flex-shrink-0 relative group bg-black"
                                >
                                    {/* Full Height Photo */}
                                    <div className="absolute inset-0 w-full h-full">
                                        <img
                                            src={moment.imageUrl}
                                            alt={moment.caption}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                                    </div>

                                    {/* Glassmorphic Content Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-white/60 backdrop-blur-xl border-t border-white/20 py-4 px-6 flex flex-col justify-center items-center text-center z-10 transition-colors duration-300">
                                        <h3 className="font-serif text-2xl text-brand-dark mb-1 line-clamp-2 drop-shadow-sm">
                                            {moment.caption}
                                        </h3>

                                        <div className="flex items-center gap-1.5 text-slate-800/60 text-[10px] font-bold tracking-widest uppercase">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-brand-dark/70">
                                                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                            </svg>
                                            <span>
                                                {moment.coordinates[1].toFixed(3)}, {moment.coordinates[0].toFixed(3)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Page Indicators (Dots) */}
                        {moments.length > 1 && (
                            <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
                                {moments.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-md backdrop-blur-sm
                                            ${idx === activeIndex ? 'bg-white scale-125' : 'bg-white/40'}
                                        `}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MomentModal;
