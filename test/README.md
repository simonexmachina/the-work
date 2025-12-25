# Test Documentation

This directory contains comprehensive tests for The Work application.

## Test Structure

### `db.test.js`

Tests for IndexedDB operations:

- Database creation and initialization
- Saving worksheets
- Retrieving worksheets by ID
- Retrieving all worksheets
- Updating existing worksheets
- Deleting worksheets

### `app.test.js`

Tests for application functionality:

- View management (showing/hiding views)
- Form handling and data collection
- Worksheet rendering (list and detail views)
- Navigation button presence

### `integration.test.js`

End-to-end integration tests:

- Complete worksheet save/retrieve flow
- Worksheet sorting by date
- Data validation (empty fields, long text)

### `utils.test.js`

Utility function tests:

- Date formatting
- Text truncation
- Preview text generation
- Form data collection and trimming

### `url-state.test.js`

URL state management tests:

- URL parameter parsing
- URL state function behavior
- History API usage
- URL state scenarios (list, worksheet, detail views)
- State restoration from URL

### `navigation.test.js`

Navigation and URL integration tests:

- URL navigation patterns
- State restoration from URL
- Browser back/forward button handling
- URL parameter edge cases

### `browser-test.html`

Browser-based test runner using Mocha and Chai. Can be opened directly in a browser for manual testing.

## Running Tests

### Command Line (Vitest)

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Browser Testing

Open `test/browser-test.html` in a modern web browser to run tests directly in the browser environment.

## Test Coverage

The test suite covers:

- ✅ All IndexedDB CRUD operations
- ✅ View management and navigation
- ✅ URL state management and restoration
- ✅ Browser history and navigation
- ✅ Form data handling
- ✅ Worksheet rendering
- ✅ Data validation
- ✅ Edge cases (empty fields, long text, invalid parameters)

## Writing New Tests

When adding new features, add corresponding tests:

1. **Unit tests** for individual functions in `db.test.js` or `utils.test.js`
2. **Integration tests** for feature workflows in `integration.test.js`
3. **DOM tests** for UI interactions in `app.test.js`

Follow the existing test patterns and use descriptive test names that explain what is being tested.
