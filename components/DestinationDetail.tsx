
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
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl max-w-2xl mx-auto"
                style={{ height: '75vh' }}
            >
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-600">
                        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Scrollable Content */}
                <div className="h-full overflow-y-auto pb-8 px-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">{stop.name}</h2>
                        <p className="text-sm text-slate-500 font-sans">Destination Details</p>
                    </div>

                    {/* Photo Gallery */}
                    {stop.gallery && stop.gallery.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-sans font-bold text-slate-700 mb-3 uppercase tracking-wide">Gallery</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                                {stop.gallery.map((imageUrl, index) => (
                                    <div
                                        key={index}
                                        className="flex-shrink-0 w-64 h-40 rounded-2xl overflow-hidden shadow-md snap-center"
                                    >
                                        <img
                                            src={imageUrl}
                                            alt={`${stop.name} ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activities */}
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
            </motion.div>
        </>
    );
};

export default DestinationDetail;
