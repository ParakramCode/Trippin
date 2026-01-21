import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJourneys } from '../context/JourneyContext';
import GlassCard from './GlassCard';
import { Moment } from '../types';

/**
 * BottomActionBar - Docked layout pattern
 * Outer container docked to bottom, inner pill centered with margin auto
 */
const PersonalizationPill: React.FC = () => {
    const { activeJourney, updateJourneyCoverImage, updateStopNote, addMoment, userLocation, viewMode } = useJourneys();
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

    const currentStop = activeJourney?.stops?.find(stop => !stop.visited);

    const handlePhotoClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && activeJourney) {
                updateJourneyCoverImage(activeJourney, URL.createObjectURL(file));
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
            addMoment(activeJourney, {
                id: `moment-${Date.now()}`,
                coordinates: [userLocation[0], userLocation[1]],
                imageUrl: 'https://picsum.photos/seed/moment-' + Date.now() + '/100/100',
                caption: `Captured at ${new Date().toLocaleTimeString()}`,
            });
        }
    };

    // Prevent wheel events from scrolling the document (screen-scoped)
    const stopWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <>
            {/* 
              Docked Bottom Layout Pattern
              - Outer container: fixed left/right/bottom with padding
              - Inner pill: max-width + margin auto (no transforms)
              - Matches bottom navigation bar pattern
            */}
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onWheel={stopWheel}
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '16px',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                    zIndex: 1000,
                    pointerEvents: 'auto',
                }}
            >
                <div
                    style={{
                        maxWidth: '420px',
                        margin: '0 auto',
                        width: '100%',
                        height: '3.5rem',
                        borderRadius: '9999px',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', paddingLeft: '2rem', paddingRight: '2rem' }}>

                        <button
                            onClick={handlePhotoClick}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '9999px', transition: 'background-color 0.2s', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1rem', height: '1rem', color: '#475569' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                            </svg>
                            <span style={{ fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Photo</span>
                        </button>

                        <button
                            onClick={handleNoteClick}
                            disabled={!currentStop}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '9999px', transition: 'background-color 0.2s', border: 'none', background: 'transparent', cursor: currentStop ? 'pointer' : 'not-allowed', opacity: currentStop ? 1 : 0.5 }}
                            onMouseEnter={(e) => currentStop && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1rem', height: '1rem', color: '#475569' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            <span style={{ fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Note</span>
                        </button>

                        <button
                            onClick={handleMomentClick}
                            disabled={!userLocation}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', borderRadius: '9999px', transition: 'background-color 0.2s', border: 'none', background: 'transparent', cursor: userLocation ? 'pointer' : 'not-allowed', opacity: userLocation ? 1 : 0.5 }}
                            onMouseEnter={(e) => userLocation && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1rem', height: '1rem', color: '#475569' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                            <span style={{ fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Moment</span>
                        </button>

                    </div>
                </div>
            </motion.div>

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
                            <GlassCard className="rounded-2xl p-6 shadow-2xl">
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
                                        className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-sans font-bold transition-colors shadow-lg"
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

export default PersonalizationPill;
