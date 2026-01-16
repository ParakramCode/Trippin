
import React from 'react';
import { useJourneys } from '../context/JourneyContext';
import { Journey } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface JourneyCardProps {
  journey: Journey;
}

const MyTrips: React.FC = () => {
  const { journeys, plannerJourneys, removeFromPlanner, activeJourney, setActiveJourney, setIsFollowing, visitedStopIds } = useJourneys();
  const navigate = useNavigate();

  const handleJourneyClick = (journey: Journey) => {
    setActiveJourney(journey);
    setIsFollowing(false); // Default to inspection/plan mode
    navigate('/map');
  };

  const handleStartNavigation = (e: React.MouseEvent, journey: Journey) => {
    e.stopPropagation();

    // Animate first (simulated by delay)
    setTimeout(() => {
      setActiveJourney(journey);
      setIsFollowing(true); // Active Navigation Mode
      navigate('/map');
    }, 400); // Wait for spring animation
  };

  const handleResume = () => {
    if (activeJourney) {
      navigate('/map');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this trip?")) {
      removeFromPlanner(id);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 pt-4 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-0 left-0 p-2 -ml-2 text-brand-dark/50 hover:text-brand-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="mt-12">
            <h1 className="font-serif text-4xl font-bold text-brand-dark">My Journey</h1>
            <p className="mt-2 text-gray-500">Your curated path through the world.</p>
          </div>
        </header>

        {/* Planner Section */}
        <div className="mb-16">
          {(plannerJourneys || []).length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-[32px] border border-dashed border-gray-300">
              <h3 className="text-2xl font-serif text-gray-400 mb-2">Your planner is empty.</h3>
              <p className="text-gray-500 mb-6">Find your next adventure in Discover.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-brand-dark text-white rounded-full text-sm font-medium hover:scale-105 transition-transform"
              >
                Go to Discover
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(plannerJourneys || []).map(journey => {
                const visitedCount = journey.stops?.filter(s => visitedStopIds.includes(s.id)).length || 0;
                const totalStops = journey.stops?.length || 0;
                const progress = totalStops > 0 ? (visitedCount / totalStops) * 100 : 0;

                return (
                  <motion.div
                    key={journey.id}
                    onClick={() => handleJourneyClick(journey)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="group relative block overflow-hidden rounded-[32px] shadow-lg hover:shadow-2xl transition-all duration-300 ease-out cursor-pointer bg-white"
                  >
                    <div className="relative aspect-[4/3]">
                      <img src={journey.imageUrl} alt={journey.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none" />

                      {/* Top Controls */}
                      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-30 pointer-events-none">
                        {/* Live Journey Pill */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => handleStartNavigation(e, journey)}
                          className="pointer-events-auto flex items-center gap-2 pl-3 pr-4 py-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white font-medium text-xs shadow-lg hover:bg-white/30 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          <span>Live Journey</span>
                        </motion.button>

                        {/* Remove Button */}
                        <button
                          onClick={(e) => handleDelete(e, journey.id)}
                          className="pointer-events-auto p-2 bg-white/10 backdrop-blur-md rounded-full text-white opacity-60 hover:opacity-100 hover:bg-red-500/80 hover:text-white transition-all border border-white/10"
                          title="Remove from Planner"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>

                      {/* Content Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-left z-20">
                        <h3 className="font-serif text-2xl font-bold mb-1 truncate drop-shadow-md">{journey.title}</h3>
                        <p className="font-sans text-xs font-medium tracking-wide uppercase opacity-80">{journey.location}</p>

                        {/* Progress Indicator */}
                        {visitedCount > 0 && (
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
        </div>
      </div>
    </div>
  );
};

export default MyTrips;
