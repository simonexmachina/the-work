# GitHub Pages Setup Instructions

## Problem

GitHub Pages is currently serving the development `index.html` from the repository root instead of the production build from the `dist/` folder. This causes the site to try loading `/src/main.jsx` which doesn't exist in the deployed files.

## Solution

You need to configure GitHub Pages to use GitHub Actions as the deployment source. Follow these steps:

### Step 1: Configure GitHub Pages Settings

1. Go to your repository: https://github.com/simonexmachina/the-work
2. Click on **Settings** (top navigation bar)
3. Click on **Pages** in the left sidebar
4. Under **Build and deployment**:
   - Find the **Source** dropdown
   - Change from "Deploy from a branch" to **"GitHub Actions"**
5. Save the changes (it should save automatically)

### Step 2: Verify the Deployment

Once you've changed the source to GitHub Actions:

1. The workflow will automatically run (or you can manually trigger it from the Actions tab)
2. Wait for the "Deploy to GitHub Pages" workflow to complete
3. Visit https://simonexmachina.github.io/the-work/ to verify it's working

### What to Expect

After the configuration:

- ✅ The site will load the production build from `dist/`
- ✅ JavaScript files will load from `/the-work/assets/index-*.js`
- ✅ The ListView will show worksheets properly
- ✅ All routing will work correctly

### Current Status

- ✅ GitHub Actions workflow is set up (`.github/workflows/deploy.yml`)
- ✅ Production build is generated correctly
- ✅ Workflow runs successfully
- ⏳ **Waiting for:** GitHub Pages source to be changed from "branch" to "GitHub Actions"

### Troubleshooting

If the site still doesn't work after changing the settings:

1. Check the Actions tab to ensure the workflow completed successfully
2. Try a hard refresh of the site (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Check the browser console for any errors
4. Verify the workflow uploaded the correct files by checking the workflow logs

### Additional Notes

- The workflow automatically runs on every push to the `main` branch
- The production build includes the router basename fix
- The dist folder is committed to the repository but GitHub Pages will use the Actions-built version

