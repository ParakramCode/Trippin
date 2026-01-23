import React, { useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { Stop } from '../types';
import { useJourneys } from '../context/JourneyContext';

interface DestinationDetailProps {
    stop: Stop;
    onClose: () => void;
}

const DestinationDetail: React.FC<DestinationDetailProps> = ({ stop, onClose }) => {
    const { setIsInspectingDestination } = useJourneys();

    // ============================================================================
    // STORIES CAROUSEL
    // ============================================================================

    const galleryImages = stop.gallery && stop.gallery.length > 0
        ? stop.gallery
        : [stop.imageUrl];

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleLeftTap = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    const handleRightTap = () => {
        if (currentImageIndex < galleryImages.length - 1) {
            setCurrentImageIndex(currentImageIndex + 1);
        }
    };

    // ============================================================================
    // SCROLL TRACKING - For tap zone management only
    // ============================================================================

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({ container: scrollContainerRef });

    // Disable tap zones when scrolled (content is covering image)
    const [tapZonesEnabled, setTapZonesEnabled] = useState(true);

    useEffect(() => {
        const unsubscribe = scrollY.onChange((latest) => {
            setTapZonesEnabled(latest < 100);
        });
        return () => unsubscribe();
    }, [scrollY]);

    // ============================================================================
    // NAV SUPPRESSION
    // ============================================================================

    useEffect(() => {
        setIsInspectingDestination(true);
        return () => {
            setIsInspectingDestination(false);
        };
    }, [setIsInspectingDestination]);

    const handleClose = () => {
        setIsInspectingDestination(false);
        onClose();
    };

    return (
        <motion.div
            ref={scrollContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto h-screen bg-black"
            style={{ overscrollBehavior: 'contain' }}
        >
            {/* ========================================================================
                FIXED BACKGROUND - Stories Carousel with Bottom Gradient
            ======================================================================== */}

            <div className="fixed inset-0 z-0">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={currentImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        src={galleryImages[currentImageIndex]}
                        alt={stop.name}
                        className="w-full h-full object-cover"
                    />
                </AnimatePresence>

                {/* Bottom gradient for text legibility */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 40%)'
                    }}
                />
            </div>

            {/* Instagram Stories progress bars - FIXED at top */}
            {galleryImages.length > 1 && (
                <div className="fixed top-6 left-4 right-4 z-20 flex gap-1.5">
                    {galleryImages.map((_, index) => (
                        <div
                            key={index}
                            className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                        >
                            <motion.div
                                initial={false}
                                animate={{
                                    width: index === currentImageIndex ? '100%'
                                        : index < currentImageIndex ? '100%'
                                            : '0%'
                                }}
                                transition={{ duration: 0.3 }}
                                className="h-full bg-white rounded-full"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Instagram tap-to-next zones */}
            {tapZonesEnabled && (
                <div className="fixed inset-0 z-10 flex pointer-events-auto">
                    <div
                        onClick={handleLeftTap}
                        className="flex-1"
                        style={{ cursor: currentImageIndex > 0 ? 'pointer' : 'default', opacity: 0 }}
                    />
                    <div
                        onClick={handleRightTap}
                        className="flex-1"
                        style={{ cursor: currentImageIndex < galleryImages.length - 1 ? 'pointer' : 'default', opacity: 0 }}
                    />
                </div>
            )}

            {/* Close Button - FIXED */}
            <button
                onClick={handleClose}
                className="fixed top-6 left-6 z-30 w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl hover:bg-white/30 transition-colors"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-white"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Spacer to push content down to 70vh */}
            <div className="h-[70vh] pointer-events-none" />

            {/* ========================================================================
                TITLE - Pure White, positioned at bottom
            ======================================================================== */}

            <div
                className="relative z-20 px-6 pb-4"
                style={{ marginTop: '-80px' }}
            >
                <h1 className="text-5xl font-sans font-bold text-white mb-3 drop-shadow-lg">
                    {stop.name}
                </h1>

                {/* Activity Chips */}
                {stop.activities && stop.activities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {stop.activities.slice(0, 3).map((activity, actIndex) => (
                            <span
                                key={actIndex}
                                className="bg-white/25 backdrop-blur-md text-white border border-white/40 px-3 py-1.5 rounded-full text-xs font-sans font-semibold tracking-wide shadow-lg"
                            >
                                {activity}
                            </span>
                        ))}
                        {stop.activities.length > 3 && (
                            <span className="bg-white/25 backdrop-blur-md text-white border border-white/40 px-3 py-1.5 rounded-full text-xs font-sans font-semibold tracking-wide shadow-lg">
                                +{stop.activities.length - 3} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ========================================================================
                TRANSPARENT GLASSMORPHIC SHEET - ALL TEXT WHITE
            ======================================================================== */}

            <div
                className="relative z-20 min-h-screen bg-white/10 backdrop-blur-xl rounded-t-[32px] border-t border-white/20"
                style={{ overscrollBehavior: 'contain' }}
            >
                {/* No pull handle - clean interface */}

                <div className="px-6 pt-6 pb-32">
                    {/* ABOUT THIS PLACE - ALL TEXT WHITE */}
                    {stop.description && (
                        <div className="mb-6">
                            <h3 className="text-xs font-sans font-bold text-white mb-2 uppercase tracking-wider">
                                About this Place
                            </h3>
                            <p className="text-white font-sans text-base leading-relaxed">
                                {stop.description}
                            </p>
                        </div>
                    )}

                    {/* LOCATION - ALL TEXT WHITE */}
                    <div className="mb-6">
                        <h3 className="text-xs font-sans font-bold text-white mb-2 uppercase tracking-wider">
                            Location
                        </h3>
                        <p className="text-white font-mono text-sm">
                            {stop.coordinates[1].toFixed(4)}°N, {stop.coordinates[0].toFixed(4)}°E
                        </p>
                    </div>

                    {/* THINGS TO DO - ALL TEXT WHITE */}
                    {stop.activities && stop.activities.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-sans font-bold text-white mb-2 uppercase tracking-wider">
                                Things to Do
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {stop.activities.map((activity, index) => (
                                    <span
                                        key={index}
                                        className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-3 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide"
                                    >
                                        {activity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GALLERY - ALL TEXT WHITE */}
                    {galleryImages.length > 1 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-sans font-bold text-white mb-2 uppercase tracking-wider">
                                Gallery
                            </h3>
                            <p className="text-white font-sans text-sm">
                                {galleryImages.length} photos • Tap sides to browse
                            </p>
                        </div>
                    )}

                    {/* Extra scroll space */}
                    <div className="h-64" />
                </div>
            </div>
        </motion.div>
    );
};

export default DestinationDetail;
