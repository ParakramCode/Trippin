
import React from 'react';
import { useJourneys } from '../context/JourneyContext';
import { Journey } from '../types';
import { useNavigate } from 'react-router-dom';

interface JourneyCardProps {
  journey: Journey;
}

const JourneyCard: React.FC<JourneyCardProps & { onClick: () => void }> = ({ journey, onClick }) => {
  return (
    <div onClick={onClick} className="block group overflow-hidden rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 ease-in-out cursor-pointer">
      <div className="relative">
        <img src={journey.imageUrl} alt={journey.title} className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <h3 className="font-serif text-3xl font-bold">{journey.title}</h3>
          <p className="text-sm opacity-90">{journey.location} &bull; {journey.duration}</p>
        </div>
      </div>
    </div>
  );
};

const MyTrips: React.FC = () => {
  const { journeys, addJourney, setActiveJourney } = useJourneys();
  const navigate = useNavigate();

  const handleJourneyClick = (journey: Journey) => {
    setActiveJourney(journey);
    navigate('/');
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="py-8 text-center">
          <h1 className="font-serif text-5xl font-bold text-brand-dark">My Journeys</h1>
          <p className="mt-2 text-gray-500">Your collection of curated adventures.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {journeys.map(journey => (
            <JourneyCard
              key={journey.id}
              journey={journey}
              onClick={() => handleJourneyClick(journey)}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={addJourney}
            className="bg-brand-dark text-white font-semibold py-3 px-8 rounded-full hover:bg-opacity-90 transition-colors shadow-lg"
          >
            Add New Journey
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyTrips;
