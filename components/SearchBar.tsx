import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
    id: string;
    place_name: string;
    center: [number, number];
    text: string;
}

interface SearchBarProps {
    mapboxToken: string;
    onSelect: (result: SearchResult) => void;
    isPreviewActive?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ mapboxToken, onSelect, isPreviewActive }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceTimeout = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        if (query.length < 3) {
            setResults([]);
            return;
        }

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        setLoading(true);
        debounceTimeout.current = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=poi,address,place&limit=5`
                );
                const data = await response.json();
                setResults(data.features || []);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, [query, mapboxToken]);

    const handleSelect = (result: SearchResult) => {
        setQuery(''); // Clear query or keep it? Usually clear on selection or show selected name. 
        // Requirement says "persistent search bar". Let's keep it clean or maybe placeholder?
        // Let's clear search text but maybe show it in the preview card.
        setQuery(result.place_name); // Show selection
        setResults([]);
        setIsFocused(false);
        onSelect(result);
    };

    return (
        <div className="absolute top-4 left-4 right-4 z-50 flex flex-col items-center">
            {/* Glassmorphic Search Input */}
            <div className="relative w-full max-w-md">
                <div className={`
                flex items-center w-full h-12 px-4 rounded-full 
                bg-white/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] 
                border border-white/40 transition-all duration-300
                ${isFocused ? 'ring-2 ring-slate-400/50 shadow-lg scale-[1.02]' : ''}
            `}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400 mr-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow click
                        placeholder="Search for a place..."
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-medium"
                    />
                    {loading && (
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin ml-2"></div>
                    )}
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults([]); }}
                            className="ml-2 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Results Dropdown */}
                <AnimatePresence>
                    {isFocused && results.length > 0 && (
                        <motion.ul
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-14 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/50"
                        >
                            {results.map((result) => (
                                <li
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none flex items-start gap-3 transition-colors"
                                >
                                    <div className="mt-1 p-1.5 bg-slate-100 rounded-full text-slate-500 shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">{result.text}</div>
                                        <div className="text-xs text-slate-500 truncate">{result.place_name}</div>
                                    </div>
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SearchBar;
