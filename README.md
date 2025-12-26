# The Work - Judge Your Neighbor Worksheet

A web application for practicing "The Work" by Byron Katie. This app helps you complete the "Judge Your Neighbor" worksheet and review your previous worksheets.

## Features

- **Create Worksheets**: Fill out the complete "Judge Your Neighbor" worksheet with all sections
- **Save & Store**: All worksheets are saved locally in your browser using IndexedDB
- **Cross-Device Sync**: Sign in to sync your worksheets across all your devices using Firebase
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

### Running the Dev Server

Start the development server:

```bash
npm run dev
```

This will start the Vite dev server on port 8080 and automatically open your browser.

### Testing the Production Build

To test the production build locally:

```bash
npm run build
npm run preview
```

This will build the app and start a preview server at `http://localhost:4173/the-work/`.

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

- Pure HTML, CSS, and JavaScript (ES modules)
- IndexedDB for local storage
- Firebase for authentication and cloud sync
- Tailwind CSS for styling
- Vitest for testing

## Sync Setup

To enable cross-device synchronization:

1. Follow the setup instructions in [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md)
2. If you encounter permissions errors, see [`FIX_PERMISSIONS.md`](./FIX_PERMISSIONS.md)
3. Sign in to sync your worksheets across devices

## Browser Support

Works in all modern browsers that support IndexedDB (Chrome, Firefox, Safari, Edge).
