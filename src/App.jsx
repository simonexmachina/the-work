import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { LoadingSection, AuthSection, UserSection } from './components/AuthSection';
import { NotificationContainer } from './components/Notification';
import { ListView } from './components/ListView';
import { WorksheetForm } from './components/WorksheetForm';
import { WorksheetDetail } from './components/WorksheetDetail';
import { useAuth } from './hooks/useAuth';
import { useDatabase } from './hooks/useDatabase';
import { useSync } from './hooks/useSync';
import { useNotification } from './hooks/useNotification';

function App() {
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
      showNotification('Sync started', 'success', 3000);
    } else if (event === 'sync-progress' && data.status === 'complete') {
      const deletedMsg = data.deleted ? `, ${data.deleted} deleted` : '';
      showNotification(
        `Sync complete: ${data.uploaded || 0} uploaded, ${data.downloaded || 0} downloaded${deletedMsg}`,
        'success'
      );
      loadWorksheets();
    } else if (event === 'sync-error') {
      showNotification('Sync error: ' + (data?.message || 'Unknown error'), 'error');
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

  const { performSync } = useSync(authService, handleSyncEvent);

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
      return;
    }

    try {
      showNotification('Syncing...', 'info', 2000);
      await performSync();
    } catch (error) {
      showNotification('Sync failed: ' + error.message, 'error');
    }
  };

  // Handle save with sync
  const handleSaveWorksheet = async worksheetData => {
    const id = await saveWorksheet(worksheetData);
    // Sync will be handled by the sync service automatically
    return id;
  };

  // Handle delete with sync
  const handleDeleteWorksheet = async id => {
    await deleteWorksheet(id);
    // Sync will be handled by the sync service automatically
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Header />

      {/* Notification Container */}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />

      {/* Auth Section */}
      {authLoading ? (
        <LoadingSection />
      ) : isAuthenticated ? (
        <UserSection user={user} onSignOut={handleSignOut} onSync={handleManualSync} />
      ) : (
        <AuthSection onSignIn={handleSignIn} onSignUp={handleSignUp} />
      )}

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
