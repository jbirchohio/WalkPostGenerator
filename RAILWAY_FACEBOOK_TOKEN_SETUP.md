# Facebook Long-Lived Token Setup for Railway

This guide explains how to set up Facebook long-lived tokens that work with Railway deployment.

## How It Works

The system now supports both database storage (for production/Railway) and file storage (for local development):

- **Production (Railway)**: Tokens are stored in your PostgreSQL database
- **Local Development**: Tokens are stored in `.facebook-token.json` file
- **Automatic Refresh**: Tokens auto-refresh when they expire in < 7 days
- **60-Day Duration**: Long-lived tokens last for 60 days

## Setup Instructions

### Step 1: Get Your Facebook App Credentials

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Select your app or create a new one
3. Go to Settings > Basic
4. Copy your **App ID** and **App Secret**

### Step 2: Set Environment Variables in Railway

Add these environment variables in your Railway dashboard:

```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_PAGE_ID=your_page_id_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_id_here
```

### Step 3: Exchange Your Short-Lived Token

#### Option A: Use the API Endpoint (Recommended for Railway)

Once deployed, make a POST request to your app:

```bash
curl -X POST https://your-app.railway.app/api/facebook/exchange-token \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_SHORT_LIVED_TOKEN_HERE"}'
```

#### Option B: Use the Local Script

For initial setup locally:

```bash
# Set environment variables
export FACEBOOK_APP_ID=your_app_id
export FACEBOOK_APP_SECRET=your_app_secret

# Run the exchange script
node exchange-facebook-token.js
```

### Step 4: Database Migration

The facebook_tokens table will be created automatically when you deploy. If you need to run migrations manually:

```bash
# Set DATABASE_URL from Railway
export DATABASE_URL=your_railway_database_url

# Generate migration
npx drizzle-kit generate

# Push migration
npx drizzle-kit push
```

## API Endpoints

### Exchange Token
```
POST /api/facebook/exchange-token
Body: { "token": "short_lived_token" }
```

### Check Token Status
```
GET /api/facebook/token-status
```

### Manually Refresh Token
```
POST /api/facebook/refresh-token
```

## How Token Management Works

1. **Initial Setup**: Exchange your short-lived token for a long-lived token (60 days)
2. **Automatic Storage**: Token is stored in database (Railway) or file (local)
3. **Auto-Refresh**: System checks token expiry before each API call
4. **Refresh Logic**: If token expires in < 7 days, it auto-refreshes
5. **Fallback**: If stored token fails, falls back to environment variable

## Environment Variables Summary

Required for Facebook posting:
```env
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_PAGE_ID=your_page_id
```

Optional (for initial token):
```env
FACEBOOK_ACCESS_TOKEN=initial_token_if_no_stored_token
```

For Instagram:
```env
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_id
```

## Troubleshooting

### Token Expired Error
- Use the `/api/facebook/exchange-token` endpoint with a new short-lived token
- Check token status at `/api/facebook/token-status`

### Database Connection Error
- Ensure DATABASE_URL is set in Railway
- Check that migrations have been run

### Permission Errors
- Ensure your Facebook App has these permissions:
  - `pages_read_engagement`
  - `pages_manage_posts`
  - `pages_show_list`

## Security Notes

- Never commit `.facebook-token.json` to git (already in .gitignore)
- Keep your App Secret secure
- Use environment variables for sensitive data
- Tokens are encrypted in transit and at rest in Railway's database

## Getting a Short-Lived Token

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Click "Generate Access Token"
4. Select required permissions
5. Copy the token (valid for ~1 hour)
6. Exchange it using the API endpoint above