import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Journey, Stop, Moment } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface JourneyContextType {
  journeys: Journey[];
  plannerJourneys: Journey[];
  addJourney: () => void;
  persistJourney: (journey: Journey) => void;
  activeJourney: Journey | null;
  setActiveJourney: (journey: Journey) => void;
  loadJourney: (journeyId: string) => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

const mockStopsSF: Stop[] = [
  { id: '1', name: 'San Francisco', coordinates: [-122.4194, 37.7749], imageUrl: 'https://picsum.photos/seed/sf/300/200', description: 'Iconic city by the bay featuring the Golden Gate Bridge.' },
  { id: '2', name: 'Sausalito', coordinates: [-122.4853, 37.8591], imageUrl: 'https://picsum.photos/seed/sau/300/200', description: 'Charming seaside town with stunning skyline views.' },
  { id: '3', name: 'Muir Woods', coordinates: [-122.5811, 37.8970], imageUrl: 'https://picsum.photos/seed/muir/300/200', description: 'Ancient redwood forest offering peaceful hiking trails.' },
];

const mockStopsBigSur: Stop[] = [
  { id: '4', name: 'Monterey', coordinates: [-121.8947, 36.6002], imageUrl: 'https://picsum.photos/seed/monterey/300/200', description: 'Historic cannery row and world-class aquarium.' },
  { id: '5', name: 'Bixby Bridge', coordinates: [-121.9017, 36.3715], imageUrl: 'https://picsum.photos/seed/bixby/300/200', description: 'Famous arch bridge with breathtaking coastal views.' },
  { id: '6', name: 'McWay Falls', coordinates: [-121.6706, 36.1576], imageUrl: 'https://picsum.photos/seed/mcway/300/200', description: 'Stunning tidefall that empties directly into the ocean.' },
];

const mockMomentsSF: Moment[] = [
  { id: 'm1', coordinates: [-122.45, 37.8], imageUrl: 'https://picsum.photos/seed/moment1/100/100', caption: 'Hidden trail view' },
  { id: 'm2', coordinates: [-122.50, 37.87], imageUrl: 'https://picsum.photos/seed/moment2/100/100', caption: 'Coffee stop' }
];

const defaultJourneys: Journey[] = [
  {
    id: '1',
    title: 'Northern Coast',
    location: 'California, USA',
    duration: '3 Days',
    imageUrl: 'https://picsum.photos/seed/coast/800/1200',
    stops: mockStopsSF,
    moments: mockMomentsSF
  },
  {
    id: '2',
    title: 'Big Sur Escape',
    location: 'California, USA',
    duration: '2 Days',
    imageUrl: 'https://picsum.photos/seed/bigsur/800/1200',
    stops: mockStopsBigSur,
    moments: []
  }
];

export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [journeys, setJourneys] = useState<Journey[]>(defaultJourneys);
  const [plannerJourneys, setPlannerJourneys] = useLocalStorage<Journey[]>('trippin_planner_journeys', []);

  // Initialize activeJourney from localStorage if available, otherwise default to first journey
  const [activeJourney, setActiveJourney] = useState<Journey | null>(() => {
    const savedId = localStorage.getItem('activeJourneyId');
    if (savedId) {
      // Check if saved ID exists in default journeys
      const found = defaultJourneys.find(j => j.id === savedId);
      if (found) return found;

      // Also check planner journeys if needed in future (requires access to hook state here)
    }
    return defaultJourneys[0];
  });

  const addJourney = useCallback(() => {
    const newJourney: Journey = {
      ...defaultJourneys[0],
      id: Date.now().toString(),
      title: `Custom Trip to ${defaultJourneys[0].title} #${journeys.length + 1}`,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/800/1200`
    };
    setJourneys(prevJourneys => [...prevJourneys, newJourney]);
  }, [journeys.length]);

  const persistJourney = useCallback((journey: Journey) => {
    const newJourney = {
      ...journey,
      clonedAt: Date.now()
    };
    setPlannerJourneys(prev => [newJourney, ...prev]);
  }, [setPlannerJourneys]);

  const loadJourney = useCallback((journeyId: string) => {
    const allJourneys = [...journeys, ...plannerJourneys];
    const journey = allJourneys.find(j => j.id === journeyId);
    if (journey) {
      setActiveJourney(journey);
      localStorage.setItem('activeJourneyId', journey.id);
    }
  }, [journeys, plannerJourneys]);

  const value = { journeys, plannerJourneys, addJourney, persistJourney, activeJourney, setActiveJourney, loadJourney };

  return (
    <JourneyContext.Provider value={value}>
      {children}
    </JourneyContext.Provider>
  );
};

export const useJourneys = (): JourneyContextType => {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error('useJourneys must be used within a JourneyProvider');
  }
  return context;
};
