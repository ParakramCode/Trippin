import React from 'react';
import { useJourneys } from '../context/JourneyContext';
import { useNavigate } from 'react-router-dom';

const Discover: React.FC = () => {
  const { journeys, loadJourney } = useJourneys();
  const navigate = useNavigate();

  const handleJourneyClick = (journeyId: string) => {
    loadJourney(journeyId); // Sets the active journey
    navigate('/map'); // Navigate to Home Map
  };

  return (
    <div className="min-h-screen bg-brand-beige p-6 pb-32">
      <h1 className="font-serif text-4xl font-bold tracking-tight text-brand-dark mb-8 pt-4">Discover</h1>

      <div className="flex flex-col gap-8">
        {journeys.map((journey) => (
          <div
            key={journey.id}
            onClick={() => handleJourneyClick(journey.id)}
            className="group relative h-[450px] w-full rounded-[40px] overflow-hidden cursor-pointer shadow-2xl shadow-black/10 hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.01]"
          >
            <img
              src={journey.imageUrl}
              alt={journey.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 opacity-90" />

            <div className="absolute top-6 right-6">
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white text-xs font-bold tracking-widest uppercase">
                From $1,299
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 text-center flex flex-col items-center">
              <span className="text-white/80 text-xs font-bold tracking-[0.2em] uppercase mb-4 border-b border-white/20 pb-2">{journey.location}</span>
              <h3 className="text-white font-serif text-4xl font-bold mb-4 leading-tight">{journey.title}</h3>
              <div className="flex items-center gap-4 text-white/90 text-sm font-medium tracking-wide">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{journey.duration}</span>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{journey.stops?.length || 0} Stops</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Discover;
