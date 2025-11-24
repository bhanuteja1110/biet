# Quick Deploy Guide

## 🚀 Fast Track to Deployment

### Step 1: Commit and Push to GitHub

```bash
# Stage all files
git add .

# Commit
git commit -m "Ready for deployment: Complete college management system"

# Create GitHub repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your repository
5. Click "Deploy" (settings auto-detected for Vite)

### Step 3: Configure Firebase

1. Go to Firebase Console → Authentication → Settings
2. Add authorized domain: `your-project.vercel.app`
3. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Step 4: Test

Visit your Vercel URL and test the application!

---

**That's it!** Your app is now live. 🎉

For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

