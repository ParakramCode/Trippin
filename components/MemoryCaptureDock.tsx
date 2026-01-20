import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJourneys } from '../context/JourneyContext';
import GlassCard from './GlassCard';
import { Moment } from '../types';

interface MemoryCaptureDockProps {
    onPhotoCapture?: () => void;
}

/**
 * Memory Capture Dock Component
 * 
 * Glassmorphic bottom dock with slate gray icons and labels.
 * Icons have white glow (drop-shadow) for depth and visibility.
 * Maintains consistency with overall slate gray typography theme.
 */
const MemoryCaptureDock: React.FC<MemoryCaptureDockProps> = ({ onPhotoCapture }) => {
    const { activeJourney, updateJourneyCoverImage, updateStopNote, addMoment, userLocation } = useJourneys();
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

    if (!activeJourney) {
        return null;
    }

    // Get the first non-visited stop for note taking
    const currentStop = activeJourney.stops?.find(stop => !stop.visited);

    const handlePhotoClick = () => {
        // Trigger file input for photo upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // Create a temporary URL for the image
                const imageUrl = URL.createObjectURL(file);
                updateJourneyCoverImage(activeJourney, imageUrl);

                // Call the optional callback
                if (onPhotoCapture) {
                    onPhotoCapture();
                }
            }
        };
        input.click();
    };

    const handleNoteClick = () => {
        if (currentStop) {
            setSelectedStopId(currentStop.id);
            setNoteText(currentStop.note || '');
            setShowNoteInput(true);
        }
    };

    const handleSaveNote = () => {
        if (selectedStopId && activeJourney) {
            updateStopNote(activeJourney, selectedStopId, noteText);
            setShowNoteInput(false);
            setNoteText('');
            setSelectedStopId(null);
        }
    };

    const handleMomentClick = () => {
        if (userLocation && activeJourney) {
            // Create a new moment at current location
            const newMoment: Moment = {
                id: `moment-${Date.now()}`,
                coordinates: [userLocation[0], userLocation[1]],
                imageUrl: 'https://picsum.photos/seed/moment-' + Date.now() + '/100/100',
                caption: `Captured at ${new Date().toLocaleTimeString()}`,
            };

            addMoment(activeJourney, newMoment);
        }
    };

    return (
        <>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute bottom-6 left-6 right-6 z-[100]"
            >
                {/* Darker glassmorphic dock with increased opacity for readability */}
                <div className="rounded-2xl p-3 overflow-hidden" style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                }}>
                    <div className="flex items-center justify-around gap-3">
                        {/* Photo Button */}
                        <button
                            onClick={handlePhotoClick}
                            className="flex-1 flex flex-col items-center gap-2 py-3 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-700/30 border border-slate-600/40 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                {/* Slate gray icon with white glow */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-6 h-6 text-slate-700"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))' }}
                                >
                                    <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                                    <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="text-xs font-sans font-semibold text-slate-700" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' }}>
                                Photo
                            </span>
                        </button>

                        {/* Note Button */}
                        <button
                            onClick={handleNoteClick}
                            disabled={!currentStop}
                            className="flex-1 flex flex-col items-center gap-2 py-3 hover:bg-white/10 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-700/30 border border-slate-600/40 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                {/* Slate gray icon with white glow */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-6 h-6 text-slate-700"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))' }}
                                >
                                    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                                    <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
                                </svg>
                            </div>
                            <span className="text-xs font-sans font-semibold text-slate-700" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' }}>
                                Note
                            </span>
                        </button>

                        {/* Moment Button */}
                        <button
                            onClick={handleMomentClick}
                            disabled={!userLocation}
                            className="flex-1 flex flex-col items-center gap-2 py-3 hover:bg-white/10 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-700/30 border border-slate-600/40 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                {/* Slate gray icon with white glow */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-6 h-6 text-slate-700"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))' }}
                                >
                                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="text-xs font-sans font-semibold text-slate-700" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' }}>
                                Moment
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Note Input Modal */}
            <AnimatePresence>
                {showNoteInput && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end p-6"
                        onClick={() => setShowNoteInput(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                        >
                            <GlassCard className="rounded-2xl p-6">
                                <h3 className="text-lg font-sans font-bold text-slate-700 mb-3">
                                    Add Note to {currentStop?.name}
                                </h3>
                                <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="What made this place special?"
                                    className="w-full h-32 px-4 py-3 bg-slate-100/80 border border-slate-300/50 rounded-xl text-slate-700 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-slate-400/50"
                                    autoFocus
                                />
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => setShowNoteInput(false)}
                                        className="flex-1 py-3 px-4 bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 rounded-xl font-sans font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveNote}
                                        className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-700 rounded-xl font-sans font-bold transition-colors shadow-lg shadow-emerald-500/30"
                                    >
                                        Save Note
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MemoryCaptureDock;
