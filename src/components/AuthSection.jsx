import React, { useState } from 'react';

export function LoadingSection() {
    return (
        <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
                <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Checking session...</p>
                </div>
            </div>
        </div>
    );
}

export function AuthSection({ onSignIn, onSignUp }) {
    const [activeTab, setActiveTab] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'signin') {
                await onSignIn(email, password);
            } else {
                await onSignUp(email, password);
            }
            setEmail('');
            setPassword('');
        } catch (error) {
            // Error handling is done in parent
        }
    };

    return (
        <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sync Across Devices</h3>
                <p className="text-gray-600 mb-4">Sign in to sync your worksheets across all your devices.</p>
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                    <button 
                        onClick={() => setActiveTab('signin')}
                        className={`px-4 py-2 font-semibold ${
                            activeTab === 'signin' 
                                ? 'text-blue-600 border-b-2 border-blue-600' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setActiveTab('signup')}
                        className={`px-4 py-2 font-semibold ${
                            activeTab === 'signup' 
                                ? 'text-blue-600 border-b-2 border-blue-600' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Sign Up
                    </button>
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input 
                            type="email" 
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="your@email.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input 
                            type="password" 
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={activeTab === 'signup' ? 6 : undefined}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={activeTab === 'signup' ? '•••••••• (min 6 characters)' : '••••••••'}
                        />
                    </div>
                    <button 
                        type="submit"
                        className={`w-full ${
                            activeTab === 'signin' 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-green-600 hover:bg-green-700'
                        } text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200`}
                    >
                        {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export function UserSection({ user, onSignOut, onSync }) {
    return (
        <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">Signed in as</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={onSync}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                        title="Sync now"
                    >
                        🔄 Sync
                    </button>
                    <button 
                        onClick={onSignOut}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

