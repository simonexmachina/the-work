import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';

export function WorksheetForm({ getWorksheet, saveWorksheet, showNotification }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);

  // Step 1 fields
  const [situation, setSituation] = useState('');
  const [person, setPerson] = useState('');
  const [wantChange, setWantChange] = useState('');
  const [advice, setAdvice] = useState('');
  const [needHappy, setNeedHappy] = useState('');

  // Step 2 - statements (array of statement objects)
  const [statements, setStatements] = useState([
    {
      statement: '',
      q1True: '',
      q2Absolutely: '',
      q3React: '',
      q4Without: '',
      turnaround: '',
    },
  ]);

  // Notes
  const [notes, setNotes] = useState('');

  // Textarea heights tracking
  const [fieldHeights, setFieldHeights] = useState({});
  const textareasRef = useRef(new Map());
  const saveHeightsTimeoutRef = useRef(null);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isLoadingRef = useRef(false);

  // Debounced function to save textarea heights
  const saveHeights = useCallback(async () => {
    if (!id) return; // Only save heights for existing worksheets

    try {
      const worksheet = await getWorksheet(id);
      if (!worksheet) return;

      // Update only the fieldHeights property
      worksheet.fieldHeights = fieldHeights;
      worksheet.updatedAt = new Date().toISOString();

      // Save without showing notification (silent save)
      await saveWorksheet(worksheet);
    } catch (error) {
      console.error('Error saving textarea heights:', error);
    }
  }, [id, fieldHeights, getWorksheet, saveWorksheet]);

  // Debounced save of heights (500ms after last change)
  useEffect(() => {
    if (!id || Object.keys(fieldHeights).length === 0) return;

    if (saveHeightsTimeoutRef.current) {
      clearTimeout(saveHeightsTimeoutRef.current);
    }

    saveHeightsTimeoutRef.current = setTimeout(() => {
      saveHeights();
    }, 500);

    return () => {
      if (saveHeightsTimeoutRef.current) {
        clearTimeout(saveHeightsTimeoutRef.current);
      }
    };
  }, [fieldHeights, id, saveHeights]);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Handle blocked navigation with confirm dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
      );
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Warn before closing/refreshing browser tab
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load existing worksheet if editing
  useEffect(() => {
    if (!id) return;

    async function loadWorksheet() {
      isLoadingRef.current = true;
      try {
        const worksheet = await getWorksheet(id);
        if (!worksheet) {
          showNotification('Worksheet not found', 'error');
          navigate('/');
          return;
        }

        // Load Step 1 fields
        setSituation(worksheet.situation || '');
        setPerson(worksheet.person || '');
        setWantChange(worksheet.wantChange || '');
        setAdvice(worksheet.advice || '');
        setNeedHappy(worksheet.needHappy || '');
        setNotes(worksheet.notes || '');

        // Load statements
        if (worksheet.statements && worksheet.statements.length > 0) {
          setStatements(worksheet.statements);
        } else {
          setStatements([
            {
              statement: '',
              q1True: '',
              q2Absolutely: '',
              q3React: '',
              q4Without: '',
              turnaround: '',
            },
          ]);
        }

        // Load textarea heights
        if (worksheet.fieldHeights) {
          setFieldHeights(worksheet.fieldHeights);
        }
      } catch (error) {
        console.error('Error loading worksheet:', error);
        showNotification('Error loading worksheet', 'error');
      } finally {
        setLoading(false);
        // Small delay to ensure all states are set before marking as loaded
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }
    }

    loadWorksheet();
  }, [id, getWorksheet, navigate, showNotification]);

  // Mark that changes have been made
  const markChanged = () => {
    if (!isLoadingRef.current) {
      setHasUnsavedChanges(true);
    }
  };

  const handleAddStatement = () => {
    setStatements([
      ...statements,
      {
        statement: '',
        q1True: '',
        q2Absolutely: '',
        q3React: '',
        q4Without: '',
        turnaround: '',
      },
    ]);
    markChanged();
  };

  const handleStatementChange = (index, field, value) => {
    const newStatements = [...statements];
    newStatements[index] = {
      ...newStatements[index],
      [field]: value,
    };
    setStatements(newStatements);
    markChanged();
  };

  const handleSave = async e => {
    e.preventDefault();

    // Filter out empty statements
    const nonEmptyStatements = statements.filter(
      s => s.statement || s.q1True || s.q2Absolutely || s.q3React || s.q4Without || s.turnaround
    );

    const worksheetData = {
      situation,
      person,
      wantChange,
      advice,
      needHappy,
      statements: nonEmptyStatements,
      notes,
      fieldHeights,
    };

    if (id) {
      worksheetData.id = id;
    }

    try {
      setHasUnsavedChanges(false);
      const savedId = await saveWorksheet(worksheetData);
      showNotification('Worksheet saved successfully!', 'success');
      navigate(`/detail/${savedId}`);
    } catch (error) {
      console.error('Error saving worksheet:', error);
      showNotification('Error saving worksheet. Please try again.', 'error');
    }
  };

  // Register textarea and set up ResizeObserver
  const registerTextarea = useCallback(
    (fieldName, element) => {
      if (!element) {
        textareasRef.current.delete(fieldName);
        return;
      }

      textareasRef.current.set(fieldName, element);

      // Apply saved height if available
      if (fieldHeights[fieldName]) {
        element.style.height = fieldHeights[fieldName];
      }

      // Set up ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        const newHeight = `${element.offsetHeight}px`;
        setFieldHeights(prev => {
          if (prev[fieldName] === newHeight) return prev;
          return { ...prev, [fieldName]: newHeight };
        });
      });

      resizeObserver.observe(element);

      // Cleanup function
      return () => {
        resizeObserver.disconnect();
      };
    },
    [fieldHeights]
  );

  const handleBack = () => {
    // Navigation blocking is now handled by useBlocker
    navigate('/');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading worksheet...</p>
      </div>
    );
  }

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
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          Save Worksheet
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* Step 1 Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
            Step 1: Judge Your Neighbor
          </h2>
          <p className="italic text-gray-600 mb-6 p-4 bg-gray-50 border-l-4 border-blue-600 rounded">
            Think of a stressful situation with someone—past, present, or future—in which you feel
            anger, sadness, fear, or shame. Be specific and brief.
          </p>

          <FormField
            label="Describe the situation:"
            value={situation}
            onChange={(val) => { setSituation(val); markChanged(); }}
            placeholder="Example: My partner didn't call me when they said they would..."
            rows={3}
            fieldName="situation"
            registerTextarea={registerTextarea}
          />
          <FormField
            label="Who angers, confuses, or disappoints you, and why?"
            value={person}
            onChange={(val) => { setPerson(val); markChanged(); }}
            placeholder="Example: I am angry at Paul because he doesn't listen to me..."
            rows={3}
            fieldName="person"
            registerTextarea={registerTextarea}
          />
          <FormField
            label="How do you want them to change? What do you want them to do?"
            value={wantChange}
            onChange={(val) => { setWantChange(val); markChanged(); }}
            placeholder="Example: I want Paul to respect me, to see me, to treat me with kindness..."
            rows={3}
            fieldName="wantChange"
            registerTextarea={registerTextarea}
          />
          <FormField
            label="What advice would you offer to them?"
            value={advice}
            onChange={(val) => { setAdvice(val); markChanged(); }}
            placeholder="Example: Paul should be more considerate, he should think before he speaks..."
            rows={3}
            fieldName="advice"
            registerTextarea={registerTextarea}
          />
          <FormField
            label="In order for you to be happy, what do you need them to think, say, feel, or do?"
            value={needHappy}
            onChange={(val) => { setNeedHappy(val); markChanged(); }}
            placeholder="Example: I need Paul to understand me, to appreciate me, to love me..."
            rows={3}
            fieldName="needHappy"
            registerTextarea={registerTextarea}
          />
        </section>

        {/* Step 2 Section - Statements */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
            Step 2: The Work
          </h2>
          <p className="italic text-gray-600 mb-6 p-4 bg-gray-50 border-l-4 border-blue-600 rounded">
            Take each statement from Step 1 and investigate it using these four questions.
          </p>

          {statements.map((statement, index) => (
            <StatementGroup
              key={index}
              number={index + 1}
              statement={statement}
              onChange={(field, value) => handleStatementChange(index, field, value)}
              registerTextarea={registerTextarea}
            />
          ))}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddStatement}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              + Add Statement
            </button>
          </div>
        </section>

        {/* Notes Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
            Notes & Reflections
          </h2>
          <FormField
            label="Additional notes or insights:"
            value={notes}
            onChange={(val) => { setNotes(val); markChanged(); }}
            placeholder="Any additional reflections, insights, or notes..."
            rows={5}
            fieldName="notes"
            registerTextarea={registerTextarea}
          />
        </section>
      </form>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, rows = 3, fieldName, registerTextarea }) {
  return (
    <div className="mt-4">
      <label className="block mb-2 font-semibold text-gray-900">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[80px]"
        ref={fieldName && registerTextarea ? el => registerTextarea(fieldName, el) : undefined}
      />
    </div>
  );
}

function StatementGroup({ number, statement, onChange, registerTextarea }) {
  const isFirstStatement = number === 1;
  const suffix = number === 1 ? '' : number;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-bold text-blue-600 mb-4">Statement {number}</h3>

      <FormField
        label="Write a statement from Step 1:"
        value={statement.statement}
        onChange={value => onChange('statement', value)}
        rows={2}
        fieldName={`statement${number}`}
        registerTextarea={registerTextarea}
      />
      <FormField
        label="Question 1: Is it true?"
        value={statement.q1True}
        onChange={value => onChange('q1True', value)}
        placeholder={isFirstStatement ? 'Yes or No, and why...' : ''}
        rows={2}
        fieldName={`q1True${suffix}`}
        registerTextarea={registerTextarea}
      />
      <FormField
        label="Question 2: Can you absolutely know it's true?"
        value={statement.q2Absolutely}
        onChange={value => onChange('q2Absolutely', value)}
        placeholder={isFirstStatement ? 'Yes or No, and why...' : ''}
        rows={2}
        fieldName={`q2Absolutely${suffix}`}
        registerTextarea={registerTextarea}
      />
      <FormField
        label="Question 3: How do you react when you believe that thought?"
        value={statement.q3React}
        onChange={value => onChange('q3React', value)}
        placeholder={
          isFirstStatement
            ? 'What happens? How do you treat the person? How do you treat yourself?'
            : ''
        }
        rows={3}
        fieldName={`q3React${suffix}`}
        registerTextarea={registerTextarea}
      />
      <FormField
        label="Question 4: Who would you be without that thought?"
        value={statement.q4Without}
        onChange={value => onChange('q4Without', value)}
        placeholder={isFirstStatement ? 'Close your eyes. Who are you without this thought?' : ''}
        rows={3}
        fieldName={`q4Without${suffix}`}
        registerTextarea={registerTextarea}
      />
      <FormField
        label="Turnarounds (write all turnarounds you find):"
        value={statement.turnaround}
        onChange={value => onChange('turnaround', value)}
        placeholder={
          isFirstStatement
            ? "For example:\n- Opposite: They don't listen to me → They do listen to me.\n- To yourself: They don't listen to me → I don't listen to me.\n- To them: They don't listen to me → I don't listen to them."
            : ''
        }
        rows={4}
        fieldName={`turnaround${number}`}
        registerTextarea={registerTextarea}
      />

      <div className="mt-2 text-sm text-gray-600 bg-gray-50 border-l-4 border-blue-200 rounded p-3">
        <p className="font-semibold mb-1">Common turnarounds to explore:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <span className="font-medium">To the opposite</span> – "They don't listen to me" → "They
            do listen to me."
          </li>
          <li>
            <span className="font-medium">To yourself</span> – "They don't listen to me" → "I don't
            listen to me."
          </li>
          <li>
            <span className="font-medium">To them</span> – "They don't listen to me" → "I don't
            listen to them."
          </li>
        </ul>
        <p className="mt-2">
          Write several genuine examples for each turnaround that feel true to you.
        </p>
      </div>
    </div>
  );
}
