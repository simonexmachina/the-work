# Deployment Guide

## GitHub Pages Deployment

This project uses GitHub Actions to automatically build and deploy to GitHub Pages.

### Initial Setup

To enable GitHub Pages deployment, you need to configure the repository settings:

1. Go to your GitHub repository: https://github.com/simonexmachina/the-work
2. Click on **Settings** (top menu)
3. Click on **Pages** (left sidebar)
4. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
   - (Do NOT select "Deploy from a branch")

### How It Works

The deployment workflow (`.github/workflows/deploy.yml`) automatically:

1. Runs on every push to the `main` branch
2. Installs dependencies with `npm ci`
3. Builds the production bundle with `npm run build`
4. Deploys the `dist/` folder to GitHub Pages

### Manual Deployment

If you need to manually trigger a deployment:

1. Go to the **Actions** tab in your GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

### Viewing Deployment Status

To check the status of deployments:

1. Go to the **Actions** tab
2. Click on the latest workflow run
3. View the build and deploy logs

### Production URL

Once deployed, your app will be available at:
https://simonexmachina.github.io/the-work/

### Troubleshooting

If the deployment fails:

1. Check the Actions tab for error logs
2. Ensure the build succeeds locally with `npm run build`
3. Verify that the `dist/` folder contains the built files
4. Check that GitHub Pages is enabled in repository settings

### Local Testing

To test the production build locally before deploying:

```bash
npm run build
npm run preview
```

This will serve the production build at `http://localhost:4173/the-work/`

