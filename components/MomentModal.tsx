
import React, { useRef, useState, useEffect } from 'react';
import { Moment, Author } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MomentModalProps {
    isOpen: boolean;
    onClose: () => void;
    moments: Moment[];
    initialIndex?: number;
    author?: Author;
}

const MomentModal: React.FC<MomentModalProps> = ({ isOpen, onClose, moments, initialIndex = 0, author }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    // Sync active index when initialIndex changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveIndex(initialIndex);
            if (scrollRef.current) {
                const scrollAmount = initialIndex * scrollRef.current.offsetWidth;
                scrollRef.current.scrollTo({ left: scrollAmount, behavior: 'instant' });
            }
        }
    }, [isOpen, initialIndex]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
            setActiveIndex(index);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
                >
                    {/* Header Controls */}
                    <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start">
                        {/* Status (Optional - e.g. Location Name) */}
                        <div className="flex flex-col">
                            {moments[activeIndex] && (
                                <motion.span
                                    key={activeIndex}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white/80 font-serif text-lg tracking-wide"
                                >
                                    {/* Could put Location Name here if available in Moment */}
                                </motion.span>
                            )}
                            <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">
                                MOMENT {activeIndex + 1} / {moments.length}
                            </span>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
                        <motion.div
                            className="h-full bg-brand-accent/80"
                            initial={{ width: 0 }}
                            animate={{ width: `${((activeIndex + 1) / moments.length) * 100}%` }}
                            transition={{ ease: "linear", duration: 0.3 }}
                        />
                    </div>

                    {/* Main Content Carousel */}
                    <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                        <div
                            ref={scrollRef}
                            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
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

                                    {/* Author Pill - Restored & Polished */}
                                    {(moment.author || author) && (
                                        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pl-1 pr-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 rounded-full shadow-sm">
                                            <img src={(moment.author || author)?.avatar} alt="Author" className="w-5 h-5 rounded-full object-cover border border-white/30" />
                                            <span className="text-white text-[10px] font-sans font-bold tracking-wide">Curated by @{(moment.author || author)?.name}</span>
                                        </div>
                                    )}

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
                                                {moment.coordinates[1].toFixed(4)}° N, {moment.coordinates[0].toFixed(4)}° E
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MomentModal;
