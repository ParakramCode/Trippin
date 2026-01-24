import React from 'react';
import { motion } from 'framer-motion';

interface StopPreviewCardProps {
    name: string;
    onAdd: () => void;
    isLoading?: boolean;
}

const StopPreviewCard: React.FC<StopPreviewCardProps> = ({ name, onAdd, isLoading }) => {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute bottom-8 left-4 right-4 z-50 flex justify-center"
        >
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/50 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-50 rounded-2xl text-rose-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-800 leading-tight break-words">{name}</h3>
                        <p className="text-sm text-slate-500 mt-1">Tap 'Add Stop' to pin this location</p>
                    </div>
                </div>

                <button
                    onClick={onAdd}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Stop
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default StopPreviewCard;
