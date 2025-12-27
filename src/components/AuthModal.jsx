import React, { useState } from 'react';
import { X } from 'lucide-react';

export function AuthModal({ isOpen, onClose, onSignIn, onSignUp }) {
  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (activeTab === 'signin') {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
      }
      setEmail('');
      setPassword('');
      onClose();
    } catch (_error) {
      // Error handling is done in parent
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <h3 className="text-2xl font-bold text-gray-900 mb-2">Sync Across Devices</h3>
        <p className="text-gray-600 mb-6">
          Sign in to sync your worksheets across all your devices.
        </p>

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
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setPassword(e.target.value)}
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

