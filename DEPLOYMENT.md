# Vercel Deployment Guide

## Quick Deploy via Web Interface

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New..." → "Project"**
4. **Import Repository**: Select `joyeb17sth-gif/mama`
5. **Configure** (usually auto-detected):
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Click "Deploy"**

Your app will be live in minutes!

## Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## Project Configuration

The project is already configured with `vercel.json`:
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework: Vite
- SPA Routing: Configured (all routes redirect to index.html)

## After Deployment

1. Your app will have a URL like: `https://your-project.vercel.app`
2. You can add a custom domain in Vercel settings
3. Every push to `main` branch will auto-deploy (if connected)

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **404 on routes**: Ensure `vercel.json` has the rewrites configuration
- **Environment variables**: Add them in Vercel project settings
