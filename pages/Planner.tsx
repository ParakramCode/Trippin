
import React from 'react';
import { useParams } from 'react-router-dom';

const Planner: React.FC = () => {
  const { id } = useParams();
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold">Trip Planner</h1>
        <p className="mt-2 text-gray-600">Details for trip ID: {id}</p>
      </div>
    </div>
  );
};

export default Planner;
