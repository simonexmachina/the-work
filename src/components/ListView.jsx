import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getSituationPreview } from '../utils/worksheet';

export function ListView({ worksheets }) {
  const navigate = useNavigate();

  const handleNewWorksheet = () => {
    navigate('/worksheet');
  };

  const handleViewWorksheet = id => {
    navigate(`/detail/${id}`);
  };

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={handleNewWorksheet}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          Create New Worksheet
        </button>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Worksheets</h2>
      <div>
        {worksheets.length === 0 ? (
          <p className="text-center py-12 text-gray-500 italic">
            No worksheets yet. Create your first one to get started.
          </p>
        ) : (
          worksheets.map(worksheet => (
            <WorksheetCard
              key={worksheet.id}
              worksheet={worksheet}
              onClick={() => handleViewWorksheet(worksheet.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WorksheetCard({ worksheet, onClick }) {
  const date = worksheet.date ? new Date(worksheet.date) : new Date();
  const truncatedPreview = getSituationPreview(worksheet);

  // Get statements from nested structure
  const statements = Array.isArray(worksheet.statements)
    ? worksheet.statements.map(s => s.statement).filter(Boolean)
    : [];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-4 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex justify-between items-start mb-2 flex-wrap">
        <h3 className="text-l font-semibold text-gray-900 mb-0">{truncatedPreview}</h3>
        <span className="text-gray-500 text-sm whitespace-nowrap ml-4">
          {date.toLocaleDateString()}
        </span>
      </div>
      {statements.length > 0 ? (
        <ul className="text-gray-600 text-sm mt-2 space-y-1">
          {statements.map((statement, index) => (
            <li key={index} className="list-disc list-inside ml-4">
              {statement}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-600 text-sm mt-2 italic">No statements yet.</div>
      )}
    </div>
  );
}
