import React, { useState, useMemo } from 'react';
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ["All", "Coastal", "City", "Mountain", "Forest", "Desert"];

const Discover: React.FC = () => {
  const { journeys, loadJourney, plannerJourneys, setIsFollowing } = useJourneys();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  React.useEffect(() => {
    setIsFollowing(false);
  }, [setIsFollowing]);

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
    <div className="min-h-screen bg-brand-beige pb-32">

      {/* Compressed Sticky Header */}
      <div className="sticky top-0 z-30 bg-brand-beige/80 backdrop-blur-md px-6 pt-6 pb-3 shadow-sm border-b border-brand-dark/5 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-brand-dark">Discover</h1>
            <div className="w-6 h-6 rounded-full bg-brand-dark/5 flex items-center justify-center">
              <span className="text-brand-dark font-serif font-bold text-[10px]">{filteredJourneys.length}</span>
            </div>
          </div>
        </div>

        {/* Compact Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-sm border border-brand-dark/10 rounded-full text-sm text-brand-dark placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-accent/20 focus:bg-white/80 transition-all font-medium"
          />
        </div>

        {/* Compact Filter Tags */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`
                                whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all duration-300 border uppercase
                                ${activeCategory === category
                  ? 'bg-brand-dark text-white border-brand-dark shadow-sm'
                  : 'bg-white/50 text-slate-500 border-transparent hover:bg-white hover:border-brand-dark/10'
                }
                            `}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid - Adjusted Top Padding */}
      <div className="px-6 pt-4">
        <AnimatePresence mode="popLayout">
          {filteredJourneys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJourneys.map((journey) => {
                const isPlanned = plannerJourneys.some(p => p.clonedFrom === journey.id || p.id === journey.id);
                const plannedJourney = plannerJourneys.find(p => p.clonedFrom === journey.id || p.id === journey.id);
                const isCompleted = plannedJourney?.isCompleted === true;

                // Mock data helpers
                const stopsCount = journey.stops?.length || 0;
                const distance = Math.floor(Math.random() * 50 + 10) + 'km';

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    key={journey.id}
                    layoutId={`journey-card-${journey.id}`}
                    onClick={() => handleJourneyClick(journey.id)}
                    className="group relative aspect-[3/4] w-full rounded-[24px] overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-500 bg-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.img
                      layoutId={`journey-image-${journey.id}`}
                      src={journey.imageUrl}
                      alt={journey.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent opacity-60" />

                    {/* Status Badge */}
                    {isPlanned && (
                      <div className="absolute top-4 right-4 z-10">
                        {isCompleted ? (
                          // Completed Badge - Solid background
                          <div className="bg-emerald-500 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                            </svg>
                            <span className="text-white text-[9px] font-bold tracking-wider uppercase">Completed</span>
                          </div>
                        ) : (
                          // Planned Badge - Dotted style with pulse
                          <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                            <span className="text-brand-dark text-[9px] font-bold tracking-wider uppercase">Planned</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Editorial Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col items-start text-left">
                      <span className="text-white/90 text-[9px] font-bold tracking-[0.2em] uppercase mb-1.5 border-b border-white/20 pb-0.5">
                        {journey.location}
                      </span>
                      <motion.h3
                        className="text-white font-serif text-2xl font-bold leading-tight mb-2.5"
                        layoutId={`journey-title-${journey.id}`}
                      >
                        {journey.title}
                      </motion.h3>

                      {/* Metadata Pills */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="bg-white/20 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white">
                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-white text-[9px] font-bold tracking-wide uppercase">{journey.duration}</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white">
                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-white text-[9px] font-bold tracking-wide uppercase">{distance}</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white">
                            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-white text-[9px] font-bold tracking-wide uppercase">{stopsCount + 3} Pics</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mb-4 backdrop-blur-md shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-dark/40">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif text-brand-dark mb-2">No adventures found.</h3>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="px-6 py-2 bg-brand-dark text-white rounded-full text-xs font-bold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Discover;
