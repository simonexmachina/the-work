import React from 'react';
import { RefreshCw, User, LogOut } from 'lucide-react';

export function Header({
  isAuthenticated,
  user,
  onProfileClick,
  onSyncClick,
  onSignOutClick,
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
            title={isAuthenticated ? 'Sync now' : 'Sign in to sync'}
            disabled={!isAuthenticated}
          >
            <RefreshCw size={24} />
          </button>

          {/* Profile/Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* User Info Button */}
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                title={`Signed in as ${user?.email}`}
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
              </button>
              {/* Sign Out Button */}
              <button
                onClick={onSignOutClick}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-all duration-200"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={onProfileClick}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              title="Sign in to sync"
            >
              <User size={24} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
