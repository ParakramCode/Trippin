
import React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Stop } from '../types';

interface DestinationDetailProps {
    stop: Stop;
    onClose: () => void;
}

const DestinationDetail: React.FC<DestinationDetailProps> = ({ stop, onClose }) => {
    const handleDragEnd = (_: any, info: PanInfo) => {
        // If dragged down more than 100px, close the sheet
        if (info.offset.y > 100) {
            onClose();
        }
    };

    // Get gallery images, fallback to imageUrl if gallery is empty
    const galleryImages = stop.gallery && stop.gallery.length > 0
        ? stop.gallery
        : [stop.imageUrl];

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />

            {/* Bottom Sheet */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl max-w-2xl mx-auto overflow-hidden"
                style={{ height: '75vh' }}
            >
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2 bg-white relative z-10">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-white/90 backdrop-blur-md hover:bg-white rounded-full transition-colors z-20 shadow-lg"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-600">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Scrollable Content */}
                <div className="h-full overflow-y-auto">
                    {/* Multi-Image Gallery with Overlay Content */}
                    <div className="relative w-full h-64 mb-6">
                        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full h-full">
                            {galleryImages.map((imageUrl, index) => (
                                <div
                                    key={index}
                                    className="relative snap-center shrink-0 w-[85vw] h-full mr-4 last:mr-0"
                                    style={{ maxWidth: '600px' }}
                                >
                                    <img
                                        src={imageUrl}
                                        alt={`${stop.name} ${index + 1}`}
                                        className="w-full h-full object-cover rounded-2xl"
                                    />

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-2xl" />

                                    {/* Content Over First Image Only */}
                                    {index === 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 p-6">
                                            <h2 className="text-3xl font-serif font-bold text-white mb-3 drop-shadow-lg">
                                                {stop.name}
                                            </h2>

                                            {/* Activity Chips */}
                                            {stop.activities && stop.activities.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {stop.activities.slice(0, 3).map((activity, actIndex) => (
                                                        <span
                                                            key={actIndex}
                                                            className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-full text-[10px] font-sans font-medium tracking-wide uppercase shadow-lg"
                                                        >
                                                            {activity}
                                                        </span>
                                                    ))}
                                                    {stop.activities.length > 3 && (
                                                        <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1 rounded-full text-[10px] font-sans font-medium tracking-wide uppercase shadow-lg">
                                                            +{stop.activities.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Below Gallery */}
                    <div className="px-6 pb-8">
                        {/* All Activities (Expanded List) */}
                        {stop.activities && stop.activities.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-sans font-bold text-slate-700 mb-3 uppercase tracking-wide">Things to Do</h3>
                                <div className="flex flex-wrap gap-2">
                                    {stop.activities.map((activity, index) => (
                                        <span
                                            key={index}
                                            className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-sans font-medium tracking-wide uppercase"
                                        >
                                            {activity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Story / Description */}
                        {stop.description && (
                            <div className="mb-6">
                                <h3 className="text-sm font-sans font-bold text-slate-700 mb-3 uppercase tracking-wide">About this Place</h3>
                                <p className="text-slate-600 font-serif text-base leading-relaxed">
                                    {stop.description}
                                </p>
                            </div>
                        )}

                        {/* Spacer for bottom padding */}
                        <div className="h-20" />
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default DestinationDetail;
