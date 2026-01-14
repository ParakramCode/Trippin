
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Journey } from '../types';

interface JourneyContextType {
  journeys: Journey[];
  addJourney: () => void;
  activeJourney: Journey | null;
  setActiveJourney: (journey: Journey) => void;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

const defaultAmalfiJourney: Journey = {
  id: '1',
  title: 'Amalfi Coast',
  location: 'Italy',
  duration: '7 Days',
  imageUrl: 'https://picsum.photos/seed/amalfi/800/1200',
};

export const JourneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [journeys, setJourneys] = useState<Journey[]>([defaultAmalfiJourney]);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);

  const addJourney = useCallback(() => {
    const newJourney: Journey = {
      ...defaultAmalfiJourney,
      id: Date.now().toString(), // Simple unique ID
      title: `${defaultAmalfiJourney.title} #${journeys.length}`,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/800/1200`
    };
    setJourneys(prevJourneys => [...prevJourneys, newJourney]);
  }, [journeys.length]);

  const value = { journeys, addJourney, activeJourney, setActiveJourney };

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
