import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateJourneyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

const CreateJourneyModal: React.FC<CreateJourneyModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [journeyName, setJourneyName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Autofocus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset input when modal closes
    useEffect(() => {
        if (!isOpen) {
            setJourneyName('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = journeyName.trim();
        if (trimmedName) {
            onCreate(trimmedName);
            setJourneyName('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/20 backdrop-blur-3xl"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.4 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl mx-6 space-y-8"
                    >
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Title */}
                            <motion.div
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-center space-y-2"
                            >
                                <h1 className="font-serif text-5xl md:text-6xl font-bold text-white drop-shadow-lg leading-tight">
                                    Create Journey
                                </h1>
                                <p className="text-white/80 text-sm font-sans font-medium tracking-wide drop-shadow">
                                    Give your adventure a name
                                </p>
                            </motion.div>

                            {/* Input Field - Glass Pill */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-xl overflow-hidden">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={journeyName}
                                        onChange={(e) => setJourneyName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="e.g., Summer Road Trip"
                                        className="w-full h-full px-8 text-xl font-sans font-semibold text-white placeholder:text-white/40 bg-transparent focus:outline-none transition-all duration-300"
                                        maxLength={50}
                                        style={{
                                            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                        }}
                                    />
                                </div>
                                <div className="mt-3 text-right">
                                    <span className="text-xs text-white/60 font-sans font-medium drop-shadow">
                                        {journeyName.length}/50
                                    </span>
                                </div>
                            </motion.div>

                            {/* Action Buttons - Glass Pills */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex gap-4 justify-center"
                            >
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-8 py-3.5 text-base font-sans font-semibold text-white bg-white/10 backdrop-blur-md rounded-full transition-all duration-300 border border-white/20 hover:border-white/40 hover:bg-white/15"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!journeyName.trim()}
                                    className="px-12 py-3.5 text-base font-sans font-bold text-slate-700 bg-white/40 backdrop-blur-md rounded-full shadow-xl hover:shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-white/50 transition-all duration-300 border border-white/30"
                                >
                                    Create Journey
                                </button>
                            </motion.div>

                            {/* Keyboard Shortcuts Hint */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-center text-xs text-white/70 font-sans font-medium drop-shadow"
                            >
                                Press <kbd className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded border border-white/20 text-white font-mono">Enter</kbd> to create or <kbd className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded border border-white/20 text-white font-mono">Esc</kbd> to cancel
                            </motion.p>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreateJourneyModal;
