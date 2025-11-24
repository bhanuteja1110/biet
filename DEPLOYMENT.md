# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] All Firestore rules deployed
- [ ] All required indexes created
- [ ] Environment variables configured
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Security tested

## Build for Production

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

The build output will be in the `dist/` directory.

## Deploy to Firebase Hosting

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Hosting

```bash
firebase init hosting
```

Select:
- Use an existing project: `biet-16d1b`
- Public directory: `dist`
- Configure as single-page app: `Yes`
- Set up automatic builds: `No` (or `Yes` if using CI/CD)

### 4. Deploy

```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy everything (hosting + firestore rules)
firebase deploy
```

## Environment Configuration

Your Firebase config is already set in `src/firebase/firebase.ts`. For production:

1. Ensure Firebase project settings are correct
2. Verify API keys are not restricted (or properly restricted)
3. Check Firebase Console for any quota limits

## Post-Deployment

1. **Test all features:**
   - User authentication
   - Role-based access
   - Real-time updates
   - File uploads
   - Data persistence

2. **Monitor:**
   - Firebase Console → Usage
   - Firebase Console → Performance
   - Error logs in Firebase Console

3. **Optimize:**
   - Enable Firestore offline persistence (already configured)
   - Monitor query performance
   - Optimize bundle size if needed

## Security Best Practices

1. **Firestore Rules:**
   - Rules are deployed and tested
   - Users can only access their own data
   - Teachers/admins have appropriate permissions

2. **Authentication:**
   - Email/password authentication enabled
   - Password reset functionality working
   - Role-based access control implemented

3. **Storage:**
   - File uploads restricted to authenticated users
   - File size limits enforced
   - File type validation in place

## Performance Optimization

1. **Code Splitting:**
   - React.lazy() used for route-based splitting
   - Components loaded on demand

2. **Firestore:**
   - Queries use indexes
   - Real-time listeners cleaned up properly
   - Pagination for large datasets (if needed)

3. **Bundle Size:**
   - Unused dependencies removed
   - Tree-shaking enabled
   - Production build optimized

## Monitoring

### Firebase Console
- Monitor Firestore reads/writes
- Check storage usage
- Review authentication logs

### Error Tracking
Consider adding error tracking service:
- Sentry
- LogRocket
- Firebase Crashlytics

## Backup Strategy

1. **Firestore Backups:**
   - Enable scheduled backups in Firebase Console
   - Export data regularly

2. **Code Backup:**
   - Use Git for version control
   - Tag production releases

## Rollback Procedure

If issues occur after deployment:

1. **Rollback Hosting:**
```bash
firebase hosting:channel:list
firebase hosting:channel:rollback <channel-id>
```

2. **Rollback Firestore Rules:**
   - Revert to previous rules version in Firebase Console
   - Or redeploy previous rules file

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review Firestore rules
3. Verify user permissions
4. Check network tab in browser DevTools

