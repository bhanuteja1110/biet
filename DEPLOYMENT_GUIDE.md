# Deployment Guide: GitHub + Vercel

This guide will help you deploy your College Management System to GitHub and Vercel.

## Prerequisites

1. **GitHub Account** - Sign up at [github.com](https://github.com)
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Firebase Project** - Already set up ✅

---

## Step 1: Prepare Your Code for GitHub

### 1.1 Check .gitignore

Make sure your `.gitignore` includes:
- `node_modules/`
- `.env` files (if you have any)
- Build outputs
- IDE files

### 1.2 Commit Your Changes

```bash
# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Complete college management system with admin, teacher, and student dashboards"

# Check status
git status
```

---

## Step 2: Push to GitHub

### 2.1 Create a New Repository on GitHub

1. Go to [github.com](https://github.com)
2. Click the **"+"** icon → **"New repository"**
3. Repository name: `college-management-system` (or your preferred name)
4. Description: "College Management System with Admin, Teacher, and Student Dashboards"
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (you already have these)
7. Click **"Create repository"**

### 2.2 Connect and Push Your Code

GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/college-management-system.git

# Rename branch to main if needed (if you're on master)
git branch -M main

# Push your code
git push -u origin main
```

**If you already have a remote:**
```bash
# Check existing remotes
git remote -v

# If origin exists, update it
git remote set-url origin https://github.com/YOUR_USERNAME/college-management-system.git

# Push
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign in** with your GitHub account
3. Click **"Add New Project"**
4. **Import** your GitHub repository:
   - Select `college-management-system` (or your repo name)
   - Click **"Import"**
5. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)
6. **Environment Variables** (if needed):
   - Add any Firebase config variables if you're using `.env` files
   - Usually not needed if Firebase config is in code
7. Click **"Deploy"**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from your project directory)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No (for first time)
# - Project name? college-management-system
# - Directory? ./
# - Override settings? No

# For production deployment
vercel --prod
```

---

## Step 4: Configure Vercel Settings

### 4.1 Build Settings (Auto-detected for Vite)

- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 4.2 Environment Variables

If you need environment variables:

1. Go to **Project Settings** → **Environment Variables**
2. Add variables like:
   - `VITE_FIREBASE_API_KEY` (if you're using .env)
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - etc.

**Note:** Your Firebase config is likely hardcoded in `src/firebase/firebase.ts`, so you might not need this.

### 4.3 Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Step 5: Firebase Configuration for Production

### 5.1 Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. **Authentication** → **Settings** → **Authorized domains**
4. Add your Vercel domain: `your-project.vercel.app`
5. Add your custom domain if you have one

### 5.2 Deploy Firestore Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes (if needed)
firebase deploy --only firestore:indexes
```

---

## Step 6: Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- ✅ Deploy on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Show deployment status in GitHub

### 6.1 Branch Protection (Optional)

1. Go to **Project Settings** → **Git**
2. Configure branch protection:
   - Production branch: `main`
   - Preview branches: All other branches

---

## Troubleshooting

### Build Fails

1. **Check build logs** in Vercel dashboard
2. **Common issues:**
   - Missing dependencies → Check `package.json`
   - TypeScript errors → Run `npm run build` locally first
   - Environment variables → Add them in Vercel settings

### Firebase Errors in Production

1. **Check authorized domains** in Firebase Console
2. **Verify Firestore rules** are deployed
3. **Check browser console** for specific errors

### Routing Issues (404 on Refresh)

1. Go to **Project Settings** → **Framework Preset**
2. Add **Rewrites**:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   Or create `vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

---

## Quick Commands Reference

```bash
# Git commands
git status                    # Check status
git add .                     # Stage all changes
git commit -m "message"       # Commit changes
git push                      # Push to GitHub

# Vercel CLI
vercel                        # Deploy to preview
vercel --prod                 # Deploy to production
vercel logs                   # View logs

# Firebase
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy to Vercel
3. ✅ Configure Firebase authorized domains
4. ✅ Deploy Firestore rules
5. ✅ Test the production site
6. ✅ Set up custom domain (optional)

---

## Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **GitHub Docs:** [docs.github.com](https://docs.github.com)
- **Firebase Docs:** [firebase.google.com/docs](https://firebase.google.com/docs)

