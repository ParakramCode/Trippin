import React from 'react';
import { useJourneys } from '../context/JourneyContext';
import { Journey } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface JourneyCardProps {
  journey: Journey;
}

const MyTrips: React.FC = () => {
  const { journeys, plannerJourneys, removeFromPlanner, activeJourney, setActiveJourney, setIsFollowing } = useJourneys();
  const navigate = useNavigate();

  const handleJourneyClick = (journey: Journey) => {
    setActiveJourney(journey);
    setIsFollowing(false); // Default to inspection/plan mode
    navigate('/map');
  };

  const handleStartNavigation = (e: React.MouseEvent, journey: Journey) => {
    e.stopPropagation();
    setActiveJourney(journey);
    setIsFollowing(true); // Active Navigation Mode
    // Logic to reset or set start index could go here. 
    // For now we preserve visited state (Resume) or could reset.
    navigate('/map');
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
        <header className="py-8 text-center relative">
          {activeJourney && (
            <button
              onClick={handleResume}
              className="absolute top-8 right-0 text-brand-dark flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
            >
              <span>Resume Active Trip</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
          <h1 className="font-serif text-5xl font-bold text-brand-dark">My Planner</h1>
          <p className="mt-2 text-gray-500">Your collection of curated adventures.</p>
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
              {(plannerJourneys || []).map(journey => (
                <motion.div
                  key={journey.id}
                  onClick={() => handleJourneyClick(journey)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative block overflow-hidden rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 ease-out cursor-pointer bg-white"
                >
                  <div className="relative aspect-[4/3]">
                    <img src={journey.imageUrl} alt={journey.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleDelete(e, journey.id)}
                      className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 hover:text-white transition-colors border border-white/20 z-20"
                      title="Remove from Planner"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>

                    {/* View on Map Button (Glassmorphic) */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleStartNavigation(e, journey)}
                      className="absolute bottom-24 right-6 z-20 flex items-center gap-2 pl-3 pr-4 py-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full text-white font-medium text-sm shadow-2xl hover:bg-white/30 transition-all group/btn"
                    >
                      <div className="p-1.5 bg-indigo-500 rounded-full shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>Live Journey</span>
                    </motion.button>

                    <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                      <h3 className="font-serif text-2xl font-bold mb-1 truncate">{journey.title}</h3>
                      <p className="text-xs font-medium tracking-wide uppercase opacity-80">{journey.location}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTrips;
