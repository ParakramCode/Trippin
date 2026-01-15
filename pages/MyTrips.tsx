
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
  const { journeys, plannerJourneys, removeFromPlanner, activeJourney, setActiveJourney } = useJourneys();
  const navigate = useNavigate();

  const handleJourneyClick = (journey: Journey) => {
    setActiveJourney(journey);
    navigate('/');
  };

  const handleResume = () => {
    if (activeJourney) {
      navigate('/');
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
                onClick={() => navigate('/discover')}
                className="px-6 py-2 bg-brand-dark text-white rounded-full text-sm font-medium hover:scale-105 transition-transform"
              >
                Go to Discover
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(plannerJourneys || []).map(journey => (
                <div
                  key={journey.id}
                  onClick={() => handleJourneyClick(journey)}
                  className="group relative block overflow-hidden rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 ease-out cursor-pointer bg-white"
                >
                  <div className="relative aspect-[4/3]">
                    <img src={journey.imageUrl} alt={journey.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleDelete(e, journey.id)}
                      className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 hover:text-white transition-colors border border-white/20"
                      title="Remove from Planner"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>

                    <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                      <h3 className="font-serif text-2xl font-bold mb-1 truncate">{journey.title}</h3>
                      <p className="text-xs font-medium tracking-wide uppercase opacity-80">{journey.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTrips;
