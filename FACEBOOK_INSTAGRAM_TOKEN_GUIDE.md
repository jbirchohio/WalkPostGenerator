# Complete Facebook & Instagram Token Management Guide

## Overview

This system manages long-lived access tokens for BOTH Facebook and Instagram through a single token system, since Instagram Business accounts are managed through Facebook's Graph API.

**One Token Rules Them All**: The same Facebook access token is used for:
- ✅ Facebook Page posts (via `FACEBOOK_PAGE_ID`)
- ✅ Instagram Business posts (via `INSTAGRAM_BUSINESS_ACCOUNT_ID`)
- ✅ Analytics for both platforms

## How The System Works

### Token Lifecycle
1. **Exchange**: Convert short-lived token (1 hour) → Long-lived token (60 days)
2. **Storage**: 
   - **Production/Railway**: Stored in PostgreSQL database
   - **Local Development**: Stored in `.facebook-token.json` file
3. **Auto-Refresh**: Automatically refreshes when < 7 days from expiry
4. **Fallback**: If no stored token, falls back to `FACEBOOK_ACCESS_TOKEN` env variable

### Files Updated
- `server/api/facebook-auth.ts` - Token management core
- `server/api/facebook.ts` - Facebook posting with auto-refresh
- `server/api/instagram.ts` - Instagram posting with auto-refresh
- `server/api/analytics.ts` - Analytics for both platforms with auto-refresh
- `shared/schema.ts` - Database schema for token storage
- `server/routes.ts` - API endpoints for token management

## Setup Instructions

### Step 1: Get Your Facebook App Credentials

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Select your app (or create one)
3. Navigate to **Settings > Basic**
4. Copy your:
   - **App ID**
   - **App Secret** (click "Show" and enter your password)

### Step 2: Get Your Page and Instagram IDs

#### Facebook Page ID:
1. Go to your Facebook Page
2. Click "About"
3. Find "Page ID" at the bottom

#### Instagram Business Account ID:
1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Generate a token with these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
4. Query: `GET /me/accounts?fields=instagram_business_account`
5. Find your Instagram Business Account ID in the response

### Step 3: Set Environment Variables

#### For Railway Deployment:
In your Railway dashboard, add these environment variables:

```env
# Required for token exchange
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here

# Required for posting
FACEBOOK_PAGE_ID=your_page_id_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_id_here

# Optional - initial token (system will exchange it automatically)
FACEBOOK_ACCESS_TOKEN=your_initial_token_here
```

#### For Local Development:
Create a `.env` file:

```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_PAGE_ID=your_page_id_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_id_here
DATABASE_URL=your_database_url_here
```

### Step 4: Get a Short-Lived Token

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Click "Generate Access Token"
4. Select these permissions:
   - **Facebook**: `pages_read_engagement`, `pages_manage_posts`, `pages_show_list`
   - **Instagram**: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`
5. Copy the generated token (valid for ~1 hour)

### Step 5: Exchange for Long-Lived Token

#### Option A: Via API (After Deployment)
```bash
curl -X POST https://your-app.railway.app/api/facebook/exchange-token \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_SHORT_LIVED_TOKEN_HERE"}'
```

#### Option B: Via Script (Local)
```bash
# Windows
set FACEBOOK_APP_ID=your_app_id
set FACEBOOK_APP_SECRET=your_app_secret
node exchange-facebook-token.js

# Mac/Linux
export FACEBOOK_APP_ID=your_app_id
export FACEBOOK_APP_SECRET=your_app_secret
node exchange-facebook-token.js
```

## API Endpoints

### Token Management
```
POST /api/facebook/exchange-token
  Body: { "token": "short_lived_token" }
  Response: { "success": true, "expires_in_days": 60 }

GET /api/facebook/token-status
  Response: { "is_valid": true, "days_remaining": 45 }

POST /api/facebook/refresh-token
  Response: { "success": true, "days_remaining": 60 }
```

### Posting Endpoints (Auto-use long-lived token)
```
POST /api/facebook
  Body: { "message": "text", "image": "base64_or_url" }

POST /api/instagram  
  Body: { "message": "caption", "image": "base64_or_url" }

POST /api/post-to-all
  Body: { "message": "text", "image": "base64_or_url" }
```

## How It Works Internally

```javascript
// Every API call now does this automatically:
const accessToken = await getValidToken();
// This function:
// 1. Checks for stored token (DB or file)
// 2. Verifies if it needs refresh (< 7 days)
// 3. Auto-refreshes if needed
// 4. Returns valid token for API use
```

## Database Migration

The system automatically creates the `facebook_tokens` table on Railway. If you need to manually migrate:

```bash
# Set Railway's DATABASE_URL
export DATABASE_URL=postgresql://...

# Generate migration
npx drizzle-kit generate

# Push to database
npx drizzle-kit push
```

## Troubleshooting

### "Token Expired" Error
- Your token expired (60 days passed)
- Solution: Get new short-lived token and exchange it

### "No token found" Error
- No token in database/file
- Solution: Exchange a short-lived token first

### "Permission Denied" Error
- Missing required permissions
- Solution: Generate new token with all required permissions

### Railway Deployment Issues
- Ensure all environment variables are set in Railway
- Check DATABASE_URL is properly configured
- Verify migrations have run

## Security Best Practices

1. **Never commit tokens**: `.facebook-token.json` is gitignored
2. **Use environment variables**: Keep App Secret secure
3. **Regular monitoring**: Check token status weekly
4. **Backup plan**: Keep token exchange script handy

## Token Permissions Required

### Facebook Permissions:
- `pages_read_engagement` - Read page analytics
- `pages_manage_posts` - Create posts
- `pages_show_list` - List pages

### Instagram Permissions:
- `instagram_basic` - Basic Instagram access
- `instagram_content_publish` - Publish content
- `instagram_manage_insights` - Read analytics

## Quick Status Check

After setup, verify everything works:

```bash
# Check token status
curl https://your-app.railway.app/api/facebook/token-status

# Test Facebook posting
curl -X POST https://your-app.railway.app/api/facebook \
  -H "Content-Type: application/json" \
  -d '{"message": "Test post from Railway!"}'

# Test Instagram posting (requires image)
curl -X POST https://your-app.railway.app/api/instagram \
  -H "Content-Type: application/json" \
  -d '{"message": "Test caption!", "image": "image_url_here"}'
```

## Summary

✅ **One token** manages both Facebook and Instagram
✅ **Auto-refresh** prevents expiration issues
✅ **Database storage** persists across Railway deployments
✅ **60-day duration** with automatic renewal
✅ **No manual updates** needed after initial setup

The system now handles everything automatically - just exchange your token once and forget about it!