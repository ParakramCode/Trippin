import React from 'react';
import { useJourneys } from '../context/JourneyContext';
import { Journey } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CreateJourneyModal from '../components/CreateJourneyModal';

const MyTrips: React.FC = () => {
  /**
   * COMPONENT MIGRATION: Per-Journey Visited State
   * 
   * BEFORE (Global state):
   * - visitedStopIds: string[] - Global, affects all journeys
   * - Progress computed by checking if stop ID exists in global array
   * 
   * AFTER (Journey-scoped):
   * - journey.stops[].visited - Per-journey property
   * - Progress computed from individual journey's visited state
   * 
   * Benefit: Each fork has independent progress tracking
   */
  const {
    plannerJourneys,      // PLANNING/LIVE only
    completedJourneys,    // COMPLETED only (separate collection)
    removeFromPlanner,
    activeJourney,
    setActiveJourney,
    loadJourney,
    createCustomJourney,
    startJourney
  } = useJourneys();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<'planned' | 'completed'>('planned');
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  // EXPLICIT STATE OWNERSHIP:
  // - Planned tab: shows plannerJourneys (PLANNING/LIVE)
  // - Completed tab: shows completedJourneys (COMPLETED)
  // - No filtering needed - collections are already separated
  const filteredJourneys = React.useMemo(() => {
    const journeys = filter === 'completed' ? completedJourneys : plannerJourneys;
    if (!journeys) return [];

    // Sort
    return journeys.sort((a, b) => {
      // Active first in Planned tab
      if (filter === 'planned') {
        if (activeJourney && a.id === activeJourney.id) return -1;
        if (activeJourney && b.id === activeJourney.id) return 1;
      }

      // For completed tab, sort by completion date (most recent first)
      if (filter === 'completed' && a.completedAt && b.completedAt) {
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      }

      return 0;
    });
  }, [plannerJourneys, completedJourneys, activeJourney, filter]);

  // Helper function to format completion date
  const formatCompletionDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleJourneyClick = (journey: Journey) => {
    // Phase 3.1: Use loadJourney for proper routing (type-safe)
    loadJourney(journey.id);

    // Phase 3.2: loadJourney handles everything, no manual flag setting needed
    navigate('/map');
  };

  const handleStartNavigation = (e: React.MouseEvent, journey: Journey) => {
    e.stopPropagation();

    // Animate first (simulated by delay)
    setTimeout(() => {
      // Phase 3.1: Use loadJourney for type-safe routing
      loadJourney(journey.id);
      // Phase 3.2: startJourney sets status='LIVE', journeyMode becomes 'NAVIGATION'
      // No manual setIsFollowing needed
      navigate('/map');
    }, 400); // Wait for spring animation
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this trip?")) {
      const journeyToDelete = plannerJourneys.find(j => j.id === id);
      if (journeyToDelete) {
        removeFromPlanner(journeyToDelete as any);
      }
    }
  };

  // Create new custom journey with modal
  const handleCreateJourney = (name: string) => {
    const newJourney = createCustomJourney(name);
    setIsCreateModalOpen(false);

    // Set as active journey and navigate to map editor
    loadJourney(newJourney.id);
    navigate('/map');
  };

  // Start/Stop journey (toggle live status and navigate to map)
  const handleStartJourney = (e: React.MouseEvent, journey: Journey) => {
    e.stopPropagation();

    // Prevent starting completed journeys
    if (journey.status === 'COMPLETED') return;

    // Phase 3.1: Use loadJourney for type-safe routing
    loadJourney(journey.id);


    startJourney(journey as any);

    // Navigate to map for active navigation
    navigate('/map');
  };

  return (
    <div className="p-4 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-4 pt-8 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-brand-dark/50 hover:text-brand-dark transition-colors rounded-full hover:bg-black/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-dark leading-none mb-0.5">My Journey</h1>
            <p className="text-xs font-medium text-gray-400 tracking-wide uppercase">Your curated path</p>
          </div>
        </header>

        {/* Task 1: Toggle UI */}
        <div className="mb-8 flex">
          <div className="bg-slate-100/50 p-1 rounded-full flex gap-1 relative backdrop-blur-sm border border-slate-200/50">
            {(['planned', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`relative z-10 px-5 py-1.5 rounded-full text-sm font-sans font-medium transition-colors duration-300 capitalize ${filter === tab ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
                {filter === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full shadow-sm border border-slate-100 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Planner Section */}
        <div className="mb-16">
          <AnimatePresence mode="popLayout">
            {(filteredJourneys || []).length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-20 bg-white/50 rounded-[32px] border border-dashed border-gray-300"
              >
                <h3 className="text-2xl font-serif text-gray-400 mb-2">
                  {filter === 'planned' ? 'No planned journeys.' : 'No completed journeys yet.'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'planned' ? 'Find your next adventure in Discover.' : 'Start exploring to build your history.'}
                </p>
                {filter === 'planned' && (
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-brand-dark text-white rounded-full text-sm font-medium hover:scale-105 transition-transform"
                  >
                    Go to Discover
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredJourneys.map(journey => {
                  const visitedCount = journey.stops?.filter(s => s.visited === true).length || 0;
                  const totalStops = journey.stops?.length || 0;
                  const progress = totalStops > 0 ? (visitedCount / totalStops) * 100 : 0;
                  const isActive = activeJourney?.id === journey.id;

                  return (
                    <motion.div
                      layout
                      key={journey.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => handleJourneyClick(journey)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ layout: { duration: 0.3 }, default: { type: "spring", stiffness: 400, damping: 17 } }}
                      className="group relative block overflow-hidden rounded-[32px] shadow-lg hover:shadow-2xl transition-all duration-300 ease-out cursor-pointer bg-white"
                    >
                      <div className="relative aspect-[4/3]">
                        <img src={journey.imageUrl} alt={journey.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 pointer-events-none" />

                        {/* Top Controls */}
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-30 pointer-events-none">
                          {/* Live/Start Journey Button - Only show for non-completed journeys */}
                          {journey.status !== "COMPLETED" && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleStartJourney(e, journey)}
                              className={`pointer-events-auto flex items-center gap-2 pl-3 pr-4 py-2 backdrop-blur-md border rounded-full font-sans font-medium text-xs shadow-lg transition-all filter drop-shadow-sm ${journey.status === "LIVE"
                                ? 'bg-emerald-500/90 border-emerald-400/30 text-white'
                                : 'bg-white/40 border-white/20 text-slate-700 hover:bg-white/50'
                                }`}
                            >
                              {journey.status === "LIVE" ? (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                  <span>Live</span>
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-700">
                                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                  </svg>
                                  <span>Start</span>
                                </>
                              )}
                            </motion.button>
                          )}

                          {/* Spacer for completed journeys to push buttons to right */}
                          {journey.status === "COMPLETED" && <div />}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {/* Edit Details Button - Only show for non-completed journeys */}
                            {journey.status !== "COMPLETED" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/planner/${journey.id}`);
                                }}
                                className="pointer-events-auto p-2 bg-white/40 backdrop-blur-md rounded-full text-slate-400 hover:text-indigo-500 hover:bg-white/60 transition-all border border-white/20"
                                title="Edit Details"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                            )}

                            {/* Remove Button */}
                            <button
                              onClick={(e) => handleDelete(e, journey.id)}
                              className="pointer-events-auto p-2 bg-white/40 backdrop-blur-md rounded-full text-slate-400 hover:text-red-400 hover:bg-white/60 transition-all border border-white/20"
                              title="Remove from Planner"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-left z-20">
                          <h3 className="font-serif text-2xl font-bold mb-1 truncate drop-shadow-md">{journey.title}</h3>
                          <p className="font-sans text-xs font-medium tracking-wide uppercase opacity-80">{journey.location}</p>

                          {/* Completion Date - Only show for completed journeys */}
                          {journey.status === "COMPLETED" && journey.completedAt && (
                            <p className="font-sans text-xs text-slate-300 mt-1">
                              Finished {formatCompletionDate(journey.completedAt)}
                            </p>
                          )}

                          {/* Progress Indicator */}
                          {visitedCount > 0 && journey.status !== "COMPLETED" && (
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">{visitedCount} of {totalStops} Stops</span>
                                <span className="text-[10px] font-bold text-white/70">{Math.round(progress)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 1, delay: 0.2 }}
                                  className="h-full bg-indigo-500 rounded-full shadow-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Journey Modal */}
      <CreateJourneyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateJourney}
      />

      {/* FAB: Create New Journey - Only show in Planned tab */}
      {filter === 'planned' && (
        <motion.button
          onClick={() => setIsCreateModalOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-brand-dark text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center z-50 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
        </motion.button>
      )}
    </div>
  );
};

export default MyTrips;
