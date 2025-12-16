# The Work - Judge Your Neighbor Worksheet

A web application for practicing "The Work" by Byron Katie. This app helps you complete the "Judge Your Neighbor" worksheet and review your previous worksheets.

## Features

- **Create Worksheets**: Fill out the complete "Judge Your Neighbor" worksheet with all sections
- **Save & Store**: All worksheets are saved locally in your browser using IndexedDB
- **Review Previous Worksheets**: View a list of all your previous worksheets
- **Edit & Delete**: Edit existing worksheets or delete them if needed
- **Clean Interface**: Simple, beautiful design using Tailwind CSS

## How to Use

1. Open `index.html` in a modern web browser
2. Click "Create New Worksheet" to start a new worksheet
3. Fill out the form with your thoughts and reflections
4. Click "Save Worksheet" to save your work
5. View your saved worksheets from the list
6. Click on any worksheet to view its details
7. Edit or delete worksheets as needed

## Development

### Running Tests

First, install dependencies:

```bash
npm install
```

Then run tests:

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- `test/db.test.js` - IndexedDB operations tests
- `test/app.test.js` - App functionality and DOM tests
- `test/integration.test.js` - End-to-end integration tests
- `test/utils.test.js` - Utility function tests

## Technology

- Pure HTML, CSS, and JavaScript (no frameworks)
- IndexedDB for local storage
- Tailwind CSS for styling
- Vitest for testing

## Browser Support

Works in all modern browsers that support IndexedDB (Chrome, Firefox, Safari, Edge).
