import React, { useRef } from 'react';
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

    // Initial scroll effect
    React.useLayoutEffect(() => {
        if (isOpen && scrollRef.current && moments.length > 0) {
            const width = scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left: width * initialIndex, behavior: 'instant' });
        }
    }, [isOpen, initialIndex, moments.length]);

    return (
        <AnimatePresence>
            {isOpen && moments.length > 0 && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal Frame */}
                    <motion.div
                        className="relative max-w-4xl w-full aspect-[4/5] md:aspect-video rounded-2xl shadow-2xl overflow-hidden border-[12px] border-white bg-black z-10"
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent map interaction and close logic
                        }}
                    >
                        <div
                            ref={scrollRef}
                            className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                            style={{ scrollBehavior: 'smooth' }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {moments.map((moment) => (
                                <div
                                    key={moment.id}
                                    className="snap-center w-full h-full flex-shrink-0 relative"
                                >
                                    <img
                                        src={moment.imageUrl}
                                        alt={moment.caption}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Gradient Overlay & Caption */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-8 pt-24">
                                        <p className="text-white font-serif text-2xl md:text-3xl font-bold tracking-wide text-center">
                                            {moment.caption}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-black/20 hover:bg-black/50 backdrop-blur-md text-white rounded-full p-2 transition-colors border border-white/20 z-20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Visual indicator of multiple items */}
                        {moments.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                {moments.map((_, idx) => (
                                    <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50" />
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
