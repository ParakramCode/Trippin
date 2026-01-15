import React, { useState, useMemo } from 'react';
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ["All", "Coastal", "City", "Mountain", "Forest", "Desert"];

const Discover: React.FC = () => {
  const { journeys, loadJourney, plannerJourneys } = useJourneys();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const handleJourneyClick = (journeyId: string) => {
    loadJourney(journeyId);
    navigate('/map');
  };

  const filteredJourneys = useMemo(() => {
    return journeys.filter(journey => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = journey.title.toLowerCase().includes(query) ||
        journey.location.toLowerCase().includes(query);

      if (activeCategory === "All") return matchesSearch;

      // Simple heuristic for demo purposes since we don't have explicit tags
      const textToScan = `${journey.title} ${journey.location}`.toLowerCase();
      const categoryKeywords: Record<string, string[]> = {
        "Coastal": ["coast", "beach", "ocean", "sur", "bay"],
        "City": ["francisco", "city", "urban", "downtown"],
        "Mountain": ["mountain", "peak", "alp", "sierr"],
        "Forest": ["forest", "wood", "tree"],
        "Desert": ["desert", "sand", "dune"]
      };

      const keywords = categoryKeywords[activeCategory] || [];
      const matchesCategory = keywords.some(k => textToScan.includes(k));

      return matchesSearch && matchesCategory;
    });
  }, [journeys, searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-brand-beige p-6 pb-32">
      <header className="mb-8 pt-4 space-y-6">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-brand-dark">Discover</h1>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white/40 backdrop-blur-lg border border-white/30 rounded-full text-brand-dark placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:bg-white/60 transition-all font-medium"
          />
        </div>

        {/* Filter Tags */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                                whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 border
                                ${activeCategory === category
                  ? 'bg-brand-dark text-white border-brand-dark shadow-lg shadow-brand-dark/20'
                  : 'bg-white/40 text-slate-600 border-white/30 hover:bg-white/60'
                }
                            `}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      {/* Results Grid */}
      <AnimatePresence mode="popLayout">
        {filteredJourneys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJourneys.map((journey) => {
              const isPlanned = plannerJourneys.some(p => p.clonedFrom === journey.id || p.id === journey.id);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={journey.id}
                  layoutId={`journey-card-${journey.id}`}
                  onClick={() => handleJourneyClick(journey.id)}
                  className="group relative aspect-[3/4] w-full rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-500 bg-white"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.img
                    layoutId={`journey-image-${journey.id}`}
                    src={journey.imageUrl}
                    alt={journey.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

                  {/* Planner Badge */}
                  {isPlanned && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-white/50">
                        <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                        <span className="text-brand-dark text-[10px] font-bold tracking-wider uppercase">In Planner</span>
                      </div>
                    </div>
                  )}

                  {/* Editorial Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center text-center">
                    <span className="text-white/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                      {journey.location}
                    </span>
                    <motion.h3
                      className="text-white font-serif text-3xl font-bold leading-tight mb-1"
                      layoutId={`journey-title-${journey.id}`}
                    >
                      {journey.title}
                    </motion.h3>
                    <p className="text-white/70 text-xs font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                      {journey.duration} &bull; {journey.stops?.length || 0} Stops
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-2xl font-serif text-brand-dark mb-2">No adventures found.</h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm">
              Try searching for another horizon or selecting a different category.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="mt-6 px-6 py-2 bg-brand-dark text-white rounded-full text-sm font-medium hover:scale-105 transition-transform"
            >
              Clear Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
