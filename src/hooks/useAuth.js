import { useState, useEffect, useCallback } from 'react';
import { FirebaseAuthService } from '../services/firebase-auth.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC1nmSSaOSZJVqI9tdIGBDGkiC1asRec5s',
  authDomain: 'the-work-46755.firebaseapp.com',
  projectId: 'the-work-46755',
  storageBucket: 'the-work-46755.firebasestorage.app',
  messagingSenderId: '792441404750',
  appId: '1:792441404750:web:fbebcb49f6fce10fbfb21f',
};

let authServiceInstance = null;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authService, setAuthService] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!authServiceInstance) {
          authServiceInstance = new FirebaseAuthService(FIREBASE_CONFIG);
          await authServiceInstance.initialize();
        }

        if (mounted) {
          setAuthService(authServiceInstance);

          // Listen for auth state changes
          const unsubscribe = authServiceInstance.addListener((event, _data) => {
            if (mounted) {
              if (event === 'signin') {
                authServiceInstance.getCurrentUser().then(u => {
                  if (mounted) setUser(u);
                });
              } else if (event === 'signout') {
                setUser(null);
              }
            }
          });

          // Get current user
          const currentUser = await authServiceInstance.getCurrentUser();
          if (mounted) {
            setUser(currentUser);
            setLoading(false);
          }

          return unsubscribe;
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signUp = useCallback(
    async (email, password) => {
      if (!authService) throw new Error('Auth service not initialized');
      await authService.signUp(email, password);
    },
    [authService]
  );

  const signIn = useCallback(
    async (email, password) => {
      if (!authService) throw new Error('Auth service not initialized');
      await authService.signIn(email, password);
    },
    [authService]
  );

  const signOut = useCallback(async () => {
    if (!authService) return;
    await authService.signOut();
  }, [authService]);

  return {
    user,
    loading,
    authService,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
}
