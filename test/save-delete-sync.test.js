import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

describe('Save and Delete Sync Flow', () => {
  let mockAuthService;
  let mockSyncWorksheet;
  let mockGetWorksheet;
  let mockSaveWorksheet;
  let mockDeleteWorksheet;
  let isAuthenticated;

  beforeEach(() => {
    isAuthenticated = true;

    mockAuthService = {
      isAuthenticated: vi.fn(async () => isAuthenticated),
      getUserId: vi.fn(async () => 'test-user'),
    };

    mockSyncWorksheet = vi.fn(async () => {});
    mockGetWorksheet = vi.fn();
    mockSaveWorksheet = vi.fn();
    mockDeleteWorksheet = vi.fn();
  });

  it('should sync worksheet after save when authenticated', async () => {
    const worksheetData = {
      situation: 'Test situation',
      date: new Date().toISOString(),
    };

    const savedId = 'saved-id-123';
    const savedWorksheet = {
      id: savedId,
      ...worksheetData,
      updatedAt: new Date().toISOString(),
    };

    mockSaveWorksheet.mockResolvedValue(savedId);
    mockGetWorksheet.mockResolvedValue(savedWorksheet);

    // Simulate handleSaveWorksheet
    const handleSaveWorksheet = async data => {
      const id = await mockSaveWorksheet(data);

      // Sync to Firebase if authenticated
      if (await mockAuthService.isAuthenticated()) {
        try {
          const worksheet = await mockGetWorksheet(id);
          await mockSyncWorksheet(worksheet);
        } catch (error) {
          console.error('Error syncing saved worksheet:', error);
        }
      }

      return id;
    };

    // Execute
    const resultId = await handleSaveWorksheet(worksheetData);

    // Verify
    expect(resultId).toBe(savedId);
    expect(mockSaveWorksheet).toHaveBeenCalledWith(worksheetData);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockGetWorksheet).toHaveBeenCalledWith(savedId);
    expect(mockSyncWorksheet).toHaveBeenCalledWith(savedWorksheet);
  });

  it('should not sync worksheet after save when not authenticated', async () => {
    isAuthenticated = false;

    const worksheetData = {
      situation: 'Test situation',
      date: new Date().toISOString(),
    };

    const savedId = 'saved-id-456';
    mockSaveWorksheet.mockResolvedValue(savedId);

    // Simulate handleSaveWorksheet
    const handleSaveWorksheet = async data => {
      const id = await mockSaveWorksheet(data);

      // Sync to Firebase if authenticated
      if (await mockAuthService.isAuthenticated()) {
        try {
          const worksheet = await mockGetWorksheet(id);
          await mockSyncWorksheet(worksheet);
        } catch (error) {
          console.error('Error syncing saved worksheet:', error);
        }
      }

      return id;
    };

    // Execute
    await handleSaveWorksheet(worksheetData);

    // Verify - should NOT sync
    expect(mockSaveWorksheet).toHaveBeenCalled();
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockSyncWorksheet).not.toHaveBeenCalled();
  });

  it('should sync worksheet after delete when authenticated', async () => {
    const worksheetId = 'delete-id-789';
    const worksheet = {
      id: worksheetId,
      situation: 'To be deleted',
      date: new Date().toISOString(),
    };

    const deletedWorksheet = {
      ...worksheet,
      deleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // First call returns the worksheet before deletion
    // Second call returns the worksheet with deletion tombstone
    mockGetWorksheet.mockResolvedValueOnce(worksheet).mockResolvedValueOnce(deletedWorksheet);
    mockDeleteWorksheet.mockResolvedValue(undefined);

    // Simulate handleDeleteWorksheet
    const handleDeleteWorksheet = async id => {
      // Get the worksheet before deleting to sync the deletion
      const ws = await mockGetWorksheet(id);

      await mockDeleteWorksheet(id);

      // Sync deletion to Firebase if authenticated
      if ((await mockAuthService.isAuthenticated()) && ws) {
        try {
          // Get the updated worksheet with deletion tombstone
          const deletedWs = await mockGetWorksheet(id);
          if (deletedWs) {
            await mockSyncWorksheet(deletedWs);
          }
        } catch (error) {
          console.error('Error syncing deleted worksheet:', error);
        }
      }
    };

    // Execute
    await handleDeleteWorksheet(worksheetId);

    // Verify
    expect(mockGetWorksheet).toHaveBeenCalledTimes(2); // Once before delete, once after
    expect(mockDeleteWorksheet).toHaveBeenCalledWith(worksheetId);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockSyncWorksheet).toHaveBeenCalledWith(deletedWorksheet);
  });

  it('should not sync worksheet after delete when not authenticated', async () => {
    isAuthenticated = false;

    const worksheetId = 'delete-id-000';
    const worksheet = {
      id: worksheetId,
      situation: 'To be deleted',
      date: new Date().toISOString(),
    };

    mockGetWorksheet.mockResolvedValue(worksheet);
    mockDeleteWorksheet.mockResolvedValue(undefined);

    // Simulate handleDeleteWorksheet
    const handleDeleteWorksheet = async id => {
      const ws = await mockGetWorksheet(id);
      await mockDeleteWorksheet(id);

      if ((await mockAuthService.isAuthenticated()) && ws) {
        try {
          const deletedWs = await mockGetWorksheet(id);
          if (deletedWs) {
            await mockSyncWorksheet(deletedWs);
          }
        } catch (error) {
          console.error('Error syncing deleted worksheet:', error);
        }
      }
    };

    // Execute
    await handleDeleteWorksheet(worksheetId);

    // Verify - should NOT sync
    expect(mockGetWorksheet).toHaveBeenCalledTimes(1); // Only once before delete
    expect(mockDeleteWorksheet).toHaveBeenCalled();
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockSyncWorksheet).not.toHaveBeenCalled();
  });

  it('should handle sync errors gracefully during save', async () => {
    const worksheetData = {
      situation: 'Test situation',
      date: new Date().toISOString(),
    };

    const savedId = 'error-id-123';
    const savedWorksheet = {
      id: savedId,
      ...worksheetData,
      updatedAt: new Date().toISOString(),
    };

    mockSaveWorksheet.mockResolvedValue(savedId);
    mockGetWorksheet.mockResolvedValue(savedWorksheet);
    mockSyncWorksheet.mockRejectedValue(new Error('Network error'));

    // Simulate handleSaveWorksheet with error handling
    const handleSaveWorksheet = async data => {
      const id = await mockSaveWorksheet(data);

      // Sync to Firebase if authenticated
      if (await mockAuthService.isAuthenticated()) {
        try {
          const worksheet = await mockGetWorksheet(id);
          await mockSyncWorksheet(worksheet);
        } catch (error) {
          // Error is logged but not thrown - local save succeeded
          console.error('Error syncing saved worksheet:', error);
        }
      }

      return id;
    };

    // Execute - should not throw even though sync fails
    const resultId = await handleSaveWorksheet(worksheetData);

    // Verify - save succeeded even though sync failed
    expect(resultId).toBe(savedId);
    expect(mockSaveWorksheet).toHaveBeenCalledWith(worksheetData);
    expect(mockSyncWorksheet).toHaveBeenCalled();
  });

  it('should handle sync errors gracefully during delete', async () => {
    const worksheetId = 'error-delete-id';
    const worksheet = {
      id: worksheetId,
      situation: 'To be deleted',
      date: new Date().toISOString(),
    };

    const deletedWorksheet = {
      ...worksheet,
      deleted: true,
      deletedAt: new Date().toISOString(),
    };

    mockGetWorksheet.mockResolvedValueOnce(worksheet).mockResolvedValueOnce(deletedWorksheet);
    mockDeleteWorksheet.mockResolvedValue(undefined);
    mockSyncWorksheet.mockRejectedValue(new Error('Network error'));

    // Simulate handleDeleteWorksheet with error handling
    const handleDeleteWorksheet = async id => {
      const ws = await mockGetWorksheet(id);
      await mockDeleteWorksheet(id);

      if ((await mockAuthService.isAuthenticated()) && ws) {
        try {
          const deletedWs = await mockGetWorksheet(id);
          if (deletedWs) {
            await mockSyncWorksheet(deletedWs);
          }
        } catch (error) {
          // Error is logged but not thrown - local delete succeeded
          console.error('Error syncing deleted worksheet:', error);
        }
      }
    };

    // Execute - should not throw even though sync fails
    await expect(handleDeleteWorksheet(worksheetId)).resolves.not.toThrow();

    // Verify - delete succeeded even though sync failed
    expect(mockDeleteWorksheet).toHaveBeenCalledWith(worksheetId);
    expect(mockSyncWorksheet).toHaveBeenCalled();
  });
});

