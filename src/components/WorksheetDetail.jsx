import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal } from './ConfirmModal';

export function WorksheetDetail({ getWorksheet, deleteWorksheet, showNotification }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worksheet, setWorksheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadWorksheet() {
      try {
        const data = await getWorksheet(id);
        if (!data) {
          showNotification('Worksheet not found', 'error');
          navigate('/');
          return;
        }
        setWorksheet(data);
      } catch (error) {
        console.error('Error loading worksheet:', error);
        showNotification('Error loading worksheet', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadWorksheet();
  }, [id, getWorksheet, navigate, showNotification]);

  const handleEdit = () => {
    navigate(`/worksheet/${id}`);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteWorksheet(id);
      showNotification('Worksheet deleted successfully!', 'success');
      navigate('/');
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      showNotification('Error deleting worksheet. Please try again.', 'error');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading worksheet...</p>
      </div>
    );
  }

  if (!worksheet) {
    return null;
  }

  const date = new Date(worksheet.date);

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={handleBack}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          ← Back to List
        </button>
        <button
          onClick={handleEdit}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          Delete
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
          Judge Your Neighbor
        </h2>

        <DetailField label="Situation:" value={worksheet.situation} />
        <DetailField
          label="Who angers, confuses, or disappoints you, and why?"
          value={worksheet.person}
        />
        <DetailField
          label="How do you want them to change? What do you want them to do?"
          value={worksheet.wantChange}
        />
        <DetailField label="What advice would you offer to them?" value={worksheet.advice} />
        <DetailField
          label="In order for you to be happy, what do you need them to think, say, feel, or do?"
          value={worksheet.needHappy}
        />
      </div>

      {worksheet.statements &&
        worksheet.statements.length > 0 &&
        worksheet.statements.map((statement, index) => (
          <StatementDetail key={index} statement={statement} number={index + 1} />
        ))}

      {worksheet.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
            Notes & Reflections
          </h2>
          <div className="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
            {worksheet.notes}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
        <p className="text-gray-500 text-sm">Created: {date.toLocaleString()}</p>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Worksheet"
        message="Are you sure you want to delete this worksheet? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="mb-6">
      <span className="block font-semibold text-gray-900 mb-2">{label}</span>
      <div className="text-gray-700 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap min-h-[1.5rem] detail-field-value">
        {value || ''}
      </div>
    </div>
  );
}

function StatementDetail({ statement, number }) {
  if (!statement || (!statement.statement && !statement.q1True)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
        Statement {number} - The Work
      </h2>

      {statement.statement && <DetailField label="Statement:" value={statement.statement} />}
      <DetailField label="Question 1: Is it true?" value={statement.q1True} />
      <DetailField
        label="Question 2: Can you absolutely know it's true?"
        value={statement.q2Absolutely}
      />
      <DetailField
        label="Question 3: How do you react when you believe that thought?"
        value={statement.q3React}
      />
      <DetailField
        label="Question 4: Who would you be without that thought?"
        value={statement.q4Without}
      />
      <DetailField label="Turnaround:" value={statement.turnaround} />
    </div>
  );
}
