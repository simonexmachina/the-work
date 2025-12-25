// Setup file for Vitest tests
import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock alert and confirm functions
global.alert = vi.fn();
global.confirm = vi.fn(() => true);
