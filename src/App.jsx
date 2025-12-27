import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { LoadingSection } from './components/AuthSection';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationContainer } from './components/Notification';
import { ListView } from './components/ListView';
import { WorksheetForm } from './components/WorksheetForm';
import { WorksheetDetail } from './components/WorksheetDetail';
import { useAuth } from './hooks/useAuth';
import { useDatabase } from './hooks/useDatabase';
import { useSync } from './hooks/useSync';
import { useNotification } from './hooks/useNotification';

// Updated to include user profile modal
function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const {
    user,
    loading: authLoading,
    authService,
    signUp,
    signIn,
    signOut,
    isAuthenticated,
  } = useAuth();
  const { worksheets, loadWorksheets, getWorksheet, saveWorksheet, deleteWorksheet } =
    useDatabase();
  const { notifications, showNotification, removeNotification } = useNotification();

  // Sync service with event handling
  const handleSyncEvent = (event, data) => {
    if (event === 'sync-started') {
      setIsSyncing(true);
      showNotification('Sync started', 'success', 3000);
    } else if (event === 'sync-progress' && data?.status === 'initial-sync') {
      setIsSyncing(true);
    } else if (event === 'sync-progress' && data?.status === 'complete') {
      setIsSyncing(false);
      const deletedMsg = data.deleted ? `, ${data.deleted} deleted` : '';
      showNotification(
        `Sync complete: ${data.uploaded || 0} uploaded, ${data.downloaded || 0} downloaded${deletedMsg}`,
        'success'
      );
      loadWorksheets();
    } else if (event === 'sync-error') {
      setIsSyncing(false);
      // Don't show error notification if it's just an offline error
      // The 'offline' event will handle that
      if (data?.message !== 'Cannot sync while offline') {
        showNotification('Sync error: ' + (data?.message || 'Unknown error'), 'error');
      }
    } else if (event === 'auth-error') {
      setIsSyncing(false);
      showNotification(
        'Session expired. Please sign in again to continue syncing.',
        'error',
        10000
      );
      // Auto sign out to force re-authentication
      setTimeout(() => {
        handleSignOut();
      }, 2000);
    } else if (
      event === 'worksheet-added' ||
      event === 'worksheet-updated' ||
      event === 'worksheet-deleted'
    ) {
      loadWorksheets();
    } else if (event === 'online') {
      showNotification('Back online. Syncing...', 'success', 3000);
    } else if (event === 'offline') {
      showNotification('You are offline. Changes will sync when you reconnect.', 'warning');
    }
  };

  const { performSync, syncWorksheet } = useSync(authService, handleSyncEvent);

  // Handle auth actions with notifications
  const handleSignUp = async (email, password) => {
    try {
      await signUp(email, password);
      showNotification('Account created successfully!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      await signIn(email, password);
      showNotification('Signed in successfully!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showNotification('Signed out successfully', 'success');
    } catch (error) {
      showNotification('Error signing out: ' + error.message, 'error');
    }
  };

  const handleManualSync = async () => {
    if (!isAuthenticated) {
      showNotification('Please sign in to sync', 'warning');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setIsSyncing(true);
      showNotification('Syncing...', 'info', 2000);
      await performSync();
    } catch (error) {
      setIsSyncing(false);
      showNotification('Sync failed: ' + error.message, 'error');
    }
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setIsProfileModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  // Handle save with sync
  const handleSaveWorksheet = async worksheetData => {
    const id = await saveWorksheet(worksheetData);
    
    // Sync to Firebase if authenticated
    if (isAuthenticated) {
      try {
        const savedWorksheet = await getWorksheet(id);
        await syncWorksheet(savedWorksheet);
      } catch (error) {
        console.error('Error syncing saved worksheet:', error);
        // Don't throw - local save already succeeded
      }
    }
    
    return id;
  };

  // Handle delete with sync
  const handleDeleteWorksheet = async id => {
    // Get the worksheet before deleting to sync the deletion
    const worksheet = await getWorksheet(id);
    
    await deleteWorksheet(id);
    
    // Sync deletion to Firebase if authenticated
    if (isAuthenticated && worksheet) {
      try {
        // Get the updated worksheet with deletion tombstone
        const deletedWorksheet = await getWorksheet(id);
        if (deletedWorksheet) {
          await syncWorksheet(deletedWorksheet);
        }
      } catch (error) {
        console.error('Error syncing deleted worksheet:', error);
        // Don't throw - local delete already succeeded
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Header
        isAuthenticated={isAuthenticated}
        user={user}
        onProfileClick={handleProfileClick}
        onSyncClick={handleManualSync}
        isSyncing={isSyncing}
      />

      {/* Notification Container */}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Loading Section (only show if loading) */}
      {authLoading && <LoadingSection />}

      {/* Main Content */}
      <main>
        <Routes>
          <Route path="/" element={<ListView worksheets={worksheets} />} />
          <Route
            path="/worksheet"
            element={
              <WorksheetForm
                getWorksheet={getWorksheet}
                saveWorksheet={handleSaveWorksheet}
                showNotification={showNotification}
              />
            }
          />
          <Route
            path="/worksheet/:id"
            element={
              <WorksheetForm
                getWorksheet={getWorksheet}
                saveWorksheet={handleSaveWorksheet}
                showNotification={showNotification}
              />
            }
          />
          <Route
            path="/detail/:id"
            element={
              <WorksheetDetail
                getWorksheet={getWorksheet}
                deleteWorksheet={handleDeleteWorksheet}
                showNotification={showNotification}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
