import { useState, useEffect, useCallback } from 'react';
import {
  initDB,
  getAllWorksheets,
  getWorksheetById,
  saveWorksheet as saveWorksheetDB,
  deleteWorksheet as deleteWorksheetDB,
} from '../utils/db';

export function useDatabase() {
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWorksheets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllWorksheets();
      setWorksheets(data);
      setError(null);
    } catch (err) {
      console.error('Error loading worksheets:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorksheet = useCallback(async id => {
    try {
      return await getWorksheetById(id);
    } catch (err) {
      console.error('Error getting worksheet:', err);
      throw err;
    }
  }, []);

  const saveWorksheet = useCallback(
    async worksheetData => {
      try {
        const id = await saveWorksheetDB(worksheetData);
        await loadWorksheets();
        return id;
      } catch (err) {
        console.error('Error saving worksheet:', err);
        throw err;
      }
    },
    [loadWorksheets]
  );

  const deleteWorksheet = useCallback(
    async id => {
      try {
        await deleteWorksheetDB(id);
        await loadWorksheets();
      } catch (err) {
        console.error('Error deleting worksheet:', err);
        throw err;
      }
    },
    [loadWorksheets]
  );

  useEffect(() => {
    initDB()
      .then(() => {
        loadWorksheets();
      })
      .catch(err => {
        console.error('Error initializing DB:', err);
        setError(err);
        setLoading(false);
      });
  }, [loadWorksheets]);

  return {
    worksheets,
    loading,
    error,
    loadWorksheets,
    getWorksheet,
    saveWorksheet,
    deleteWorksheet,
  };
}
