import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
            turnaround: ''
        }
    ]);
    
    // Notes
    const [notes, setNotes] = useState('');

    // Load existing worksheet if editing
    useEffect(() => {
        if (!id) return;

        async function loadWorksheet() {
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
                    setStatements([{
                        statement: '',
                        q1True: '',
                        q2Absolutely: '',
                        q3React: '',
                        q4Without: '',
                        turnaround: ''
                    }]);
                }
            } catch (error) {
                console.error('Error loading worksheet:', error);
                showNotification('Error loading worksheet', 'error');
            } finally {
                setLoading(false);
            }
        }

        loadWorksheet();
    }, [id, getWorksheet, navigate, showNotification]);

    const handleAddStatement = () => {
        setStatements([...statements, {
            statement: '',
            q1True: '',
            q2Absolutely: '',
            q3React: '',
            q4Without: '',
            turnaround: ''
        }]);
    };

    const handleStatementChange = (index, field, value) => {
        const newStatements = [...statements];
        newStatements[index] = {
            ...newStatements[index],
            [field]: value
        };
        setStatements(newStatements);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Filter out empty statements
        const nonEmptyStatements = statements.filter(s => 
            s.statement || s.q1True || s.q2Absolutely || s.q3React || s.q4Without || s.turnaround
        );

        const worksheetData = {
            situation,
            person,
            wantChange,
            advice,
            needHappy,
            statements: nonEmptyStatements,
            notes
        };

        if (id) {
            worksheetData.id = id;
        }

        try {
            const savedId = await saveWorksheet(worksheetData);
            showNotification('Worksheet saved successfully!', 'success');
            navigate(`/detail/${savedId}`);
        } catch (error) {
            console.error('Error saving worksheet:', error);
            showNotification('Error saving worksheet. Please try again.', 'error');
        }
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
                        Think of a stressful situation with someone—past, present, or future—in which you feel anger, sadness, fear, or shame. Be specific and brief.
                    </p>
                    
                    <FormField 
                        label="Describe the situation:"
                        value={situation}
                        onChange={setSituation}
                        placeholder="Example: My partner didn't call me when they said they would..."
                        rows={3}
                    />
                    <FormField 
                        label="Who angers, confuses, or disappoints you, and why?"
                        value={person}
                        onChange={setPerson}
                        placeholder="Example: I am angry at Paul because he doesn't listen to me..."
                        rows={3}
                    />
                    <FormField 
                        label="How do you want them to change? What do you want them to do?"
                        value={wantChange}
                        onChange={setWantChange}
                        placeholder="Example: I want Paul to respect me, to see me, to treat me with kindness..."
                        rows={3}
                    />
                    <FormField 
                        label="What advice would you offer to them?"
                        value={advice}
                        onChange={setAdvice}
                        placeholder="Example: Paul should be more considerate, he should think before he speaks..."
                        rows={3}
                    />
                    <FormField 
                        label="In order for you to be happy, what do you need them to think, say, feel, or do?"
                        value={needHappy}
                        onChange={setNeedHappy}
                        placeholder="Example: I need Paul to understand me, to appreciate me, to love me..."
                        rows={3}
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
                        onChange={setNotes}
                        placeholder="Any additional reflections, insights, or notes..."
                        rows={5}
                    />
                </section>
            </form>
        </div>
    );
}

function FormField({ label, value, onChange, placeholder, rows = 3 }) {
    return (
        <div className="mt-4">
            <label className="block mb-2 font-semibold text-gray-900">
                {label}
            </label>
            <textarea 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[80px]"
            />
        </div>
    );
}

function StatementGroup({ number, statement, onChange }) {
    const isFirstStatement = number === 1;
    
    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Statement {number}</h3>
            
            <FormField 
                label="Write a statement from Step 1:"
                value={statement.statement}
                onChange={(value) => onChange('statement', value)}
                rows={2}
            />
            <FormField 
                label="Question 1: Is it true?"
                value={statement.q1True}
                onChange={(value) => onChange('q1True', value)}
                placeholder={isFirstStatement ? 'Yes or No, and why...' : ''}
                rows={2}
            />
            <FormField 
                label="Question 2: Can you absolutely know it's true?"
                value={statement.q2Absolutely}
                onChange={(value) => onChange('q2Absolutely', value)}
                placeholder={isFirstStatement ? 'Yes or No, and why...' : ''}
                rows={2}
            />
            <FormField 
                label="Question 3: How do you react when you believe that thought?"
                value={statement.q3React}
                onChange={(value) => onChange('q3React', value)}
                placeholder={isFirstStatement ? 'What happens? How do you treat the person? How do you treat yourself?' : ''}
                rows={3}
            />
            <FormField 
                label="Question 4: Who would you be without that thought?"
                value={statement.q4Without}
                onChange={(value) => onChange('q4Without', value)}
                placeholder={isFirstStatement ? 'Close your eyes. Who are you without this thought?' : ''}
                rows={3}
            />
            <FormField 
                label="Turnarounds (write all turnarounds you find):"
                value={statement.turnaround}
                onChange={(value) => onChange('turnaround', value)}
                placeholder={isFirstStatement ? "For example:\n- Opposite: They don't listen to me → They do listen to me.\n- To yourself: They don't listen to me → I don't listen to me.\n- To them: They don't listen to me → I don't listen to them." : ''}
                rows={4}
            />
            
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 border-l-4 border-blue-200 rounded p-3">
                <p className="font-semibold mb-1">Common turnarounds to explore:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><span className="font-medium">To the opposite</span> – "They don't listen to me" → "They do listen to me."</li>
                    <li><span className="font-medium">To yourself</span> – "They don't listen to me" → "I don't listen to me."</li>
                    <li><span className="font-medium">To them</span> – "They don't listen to me" → "I don't listen to them."</li>
                </ul>
                <p className="mt-2">Write several genuine examples for each turnaround that feel true to you.</p>
            </div>
        </div>
    );
}

