import React from 'react';
import { RefreshCw, User } from 'lucide-react';

export function Header({
  isAuthenticated,
  user,
  onProfileClick,
  onSyncClick,
  isSyncing = false,
}) {
  return (
    <header className="mb-8 pb-6 border-b-2 border-gray-200">
      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">The Work</h1>
          <p className="text-lg text-gray-600">Judge Your Neighbor Worksheet</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-4">
          {/* Sync Button */}
          <button
            onClick={onSyncClick}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isAuthenticated
                ? 'hover:bg-blue-50 text-blue-600'
                : 'hover:bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={isAuthenticated ? (isSyncing ? 'Syncing...' : 'Sync now') : 'Sign in to sync'}
            disabled={!isAuthenticated || isSyncing}
          >
            <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
          </button>

          {/* Profile/Auth Button */}
          <button
            onClick={onProfileClick}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isAuthenticated ? 'hover:bg-blue-50' : 'hover:bg-gray-100'
            }`}
            title={isAuthenticated ? `Signed in as ${user?.email}` : 'Sign in to sync'}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isAuthenticated ? 'bg-blue-100' : ''
              }`}
            >
              <User
                size={isAuthenticated ? 18 : 24}
                className={isAuthenticated ? 'text-blue-600' : 'text-gray-600'}
              />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
