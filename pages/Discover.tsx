import React from 'react';
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Discover: React.FC = () => {
  const { journeys, loadJourney, plannerJourneys } = useJourneys();
  const navigate = useNavigate();

  const handleJourneyClick = (journeyId: string) => {
    loadJourney(journeyId);
    navigate('/map');
  };

  return (
    <div className="min-h-screen bg-brand-beige p-6 pb-32">
      <h1 className="font-serif text-4xl font-bold tracking-tight text-brand-dark mb-8 pt-4">Discover</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {journeys.map((journey) => {
          const isPlanned = plannerJourneys.some(p => p.clonedFrom === journey.id || p.id === journey.id);

          return (
            <motion.div
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
    </div>
  );
};

export default Discover;
