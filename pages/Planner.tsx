
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJourneys } from '../context/JourneyContext';
import { motion } from 'framer-motion';

const Planner: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { plannerJourneys, renameJourney, moveStop, removeStop, updateStopNote } = useJourneys();

  const journey = plannerJourneys.find(j => j.id === id);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(journey?.title || '');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  if (!journey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-gray-800">Journey Not Found</h1>
          <p className="mt-2 text-gray-600">This journey doesn't exist in your planner.</p>
          <button
            onClick={() => navigate('/my-trips')}
            className="mt-4 px-6 py-2 bg-brand-dark text-white rounded-full text-sm font-medium hover:scale-105 transition-transform"
          >
            Back to My Journeys
          </button>
        </div>
      </div>
    );
  }

  const isEditable = true; // All journeys in plannerJourneys are editable

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== journey.title) {
      renameJourney(journey.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(journey.title);
    setIsEditingTitle(false);
  };

  const handleNoteChange = (stopId: string, note: string) => {
    setEditingNotes(prev => ({ ...prev, [stopId]: note }));
  };

  const handleNoteSave = (stopId: string) => {
    const note = editingNotes[stopId] || '';
    updateStopNote(journey.id, stopId, note);
    setEditingNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[stopId];
      return newNotes;
    });
  };

  const handleNoteExpand = (stopId: string, currentNote?: string) => {
    setExpandedNoteId(stopId);
    setEditingNotes(prev => ({ ...prev, [stopId]: currentNote || '' }));
  };

  const handleNoteCancel = (stopId: string) => {
    setExpandedNoteId(null);
    setEditingNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[stopId];
      return newNotes;
    });
  };

  const handleRemoveStop = (stopId: string) => {
    if (window.confirm('Are you sure you want to remove this stop?')) {
      removeStop(journey.id, stopId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8 pt-8">
          <button
            onClick={() => navigate('/my-trips')}
            className="mb-4 p-2 -ml-2 text-brand-dark/50 hover:text-brand-dark transition-colors rounded-full hover:bg-black/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') handleTitleCancel();
                }}
                className="font-serif text-3xl font-bold text-brand-dark bg-white border-2 border-indigo-500 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={handleTitleCancel}
                className="p-2 bg-slate-300 text-slate-700 rounded-full hover:bg-slate-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-bold text-brand-dark">{journey.title}</h1>
              {isEditable && (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                  title="Rename journey"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <p className="text-sm font-medium text-gray-500 mt-1">{journey.location} • {journey.duration}</p>
        </header>

        {/* Journey Image */}
        <div className="mb-8 rounded-3xl overflow-hidden shadow-xl">
          <img src={journey.imageUrl} alt={journey.title} className="w-full h-64 object-cover" />
        </div>

        {/* Stops List */}
        <div className="space-y-4">
          <h2 className="font-sans text-xl font-bold text-slate-800 mb-4">Your Route</h2>

          {journey.stops && journey.stops.length > 0 ? (
            journey.stops.map((stop, index) => (
              <motion.div
                key={stop.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Stop Number */}
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>

                    {/* Stop Image */}
                    <img
                      src={stop.imageUrl}
                      alt={stop.name}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />

                    {/* Stop Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-sans text-lg font-bold text-slate-800 truncate">{stop.name}</h3>
                      {stop.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{stop.description}</p>
                      )}
                    </div>

                    {/* Action Buttons - Only show if editable */}
                    {isEditable && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {/* Move Up */}
                        <button
                          onClick={() => moveStop(journey.id, index, 'up')}
                          disabled={index === 0}
                          className={`p-1.5 rounded-lg transition-colors ${index === 0
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-500 hover:text-indigo-500 hover:bg-indigo-50'
                            }`}
                          title="Move up"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* Move Down */}
                        <button
                          onClick={() => moveStop(journey.id, index, 'down')}
                          disabled={index === journey.stops!.length - 1}
                          className={`p-1.5 rounded-lg transition-colors ${index === journey.stops!.length - 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-500 hover:text-indigo-500 hover:bg-indigo-50'
                            }`}
                          title="Move down"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 15.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* Delete Stop */}
                        <button
                          onClick={() => handleRemoveStop(stop.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove stop"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Note Section - Only show if editable */}
                  {isEditable && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {expandedNoteId === stop.id || stop.note ? (
                        <div>
                          <label className="block text-xs font-sans font-medium text-slate-500 mb-1.5">
                            Personal Note
                          </label>
                          <textarea
                            value={editingNotes[stop.id] ?? stop.note ?? ''}
                            onChange={(e) => handleNoteChange(stop.id, e.target.value)}
                            placeholder="Add a personal note for this stop..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            {expandedNoteId === stop.id && !stop.note && (
                              <button
                                onClick={() => handleNoteCancel(stop.id)}
                                className="px-3 py-1.5 text-xs font-sans text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => handleNoteSave(stop.id)}
                              className="px-4 py-1.5 bg-slate-600 text-white text-xs font-sans font-medium rounded-md hover:bg-slate-700 transition-colors shadow-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleNoteExpand(stop.id, stop.note)}
                          className="text-xs font-sans text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Add Note
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <p className="text-slate-500">No stops in this journey yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Planner;
