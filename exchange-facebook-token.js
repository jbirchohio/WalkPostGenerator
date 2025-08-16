/**
 * Script to exchange a Facebook short-lived token for a long-lived token
 * 
 * Before running this script:
 * 1. Set up your Facebook App ID and App Secret as environment variables
 * 2. Replace the SHORT_LIVED_TOKEN below with your actual token
 * 
 * Run with: node exchange-facebook-token.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration - REPLACE THESE VALUES
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'YOUR_APP_ID_HERE';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'YOUR_APP_SECRET_HERE';

// Your short-lived token from the user
const SHORT_LIVED_TOKEN = 'EAAPwIf5ZBg0MBPPUYHPruEMDtPg47XtWlyy6GqZBlZCIjed4kZAyHKhD1kdr8e6SZCvLYZAWA2QiEdVtzVl6JXPB0jzUPnlzBavg7cpXh9NPGLsR5cel4xVNSZA6IUmUSCCZBhgvDtXlUJwbxP5WrwWu0TRroRT5KeiIxSJLbCtsE3kRf9ZCGY6tqcN21uSWP6bZA2JdNoWhyJ2rbMHxYtYPUcOgDYrWTv2ZCqjARzNH78rrueg';

const FACEBOOK_API_VERSION = 'v18.0';
const TOKEN_STORAGE_PATH = path.join(__dirname, '.facebook-token.json');

async function exchangeToken() {
  console.log('Exchanging Facebook token...\n');
  
  if (FACEBOOK_APP_ID === 'YOUR_APP_ID_HERE' || FACEBOOK_APP_SECRET === 'YOUR_APP_SECRET_HERE') {
    console.error('ERROR: Please set your FACEBOOK_APP_ID and FACEBOOK_APP_SECRET');
    console.error('You can get these from: https://developers.facebook.com/apps/');
    console.error('\nSet them as environment variables or replace them in this script.');
    process.exit(1);
  }
  
  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`;
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: SHORT_LIVED_TOKEN
  });

  try {
    console.log('Calling Facebook API...');
    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (data.error) {
      console.error('Facebook API Error:', data.error.message);
      console.error('\nFull error:', JSON.stringify(data.error, null, 2));
      process.exit(1);
    }

    // Calculate expiry time
    const expiresAt = Date.now() + (data.expires_in || 5184000) * 1000;
    const expiryDate = new Date(expiresAt);
    const daysUntilExpiry = Math.floor(data.expires_in / 86400);

    console.log('\n✅ SUCCESS! Token exchanged successfully');
    console.log('═══════════════════════════════════════');
    console.log(`Token expires in: ${daysUntilExpiry} days`);
    console.log(`Expiry date: ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`);
    
    // Store the token
    const tokenStorage = {
      access_token: data.access_token,
      expires_at: expiresAt,
      last_refreshed: Date.now(),
      expires_in_days: daysUntilExpiry
    };
    
    fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(tokenStorage, null, 2));
    console.log(`\nToken saved to: ${TOKEN_STORAGE_PATH}`);
    
    // Also create/update .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      // Update existing token
      if (envContent.includes('FACEBOOK_ACCESS_TOKEN=')) {
        envContent = envContent.replace(/FACEBOOK_ACCESS_TOKEN=.*/g, `FACEBOOK_ACCESS_TOKEN=${data.access_token}`);
      } else {
        envContent += `\nFACEBOOK_ACCESS_TOKEN=${data.access_token}`;
      }
    } else {
      envContent = `FACEBOOK_ACCESS_TOKEN=${data.access_token}`;
    }
    
    // Add App ID and Secret if not present
    if (!envContent.includes('FACEBOOK_APP_ID=')) {
      envContent += `\nFACEBOOK_APP_ID=${FACEBOOK_APP_ID}`;
    }
    if (!envContent.includes('FACEBOOK_APP_SECRET=')) {
      envContent += `\nFACEBOOK_APP_SECRET=${FACEBOOK_APP_SECRET}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`\n.env file updated with new token`);
    
    console.log('\n📋 NEXT STEPS:');
    console.log('═══════════════');
    console.log('1. Your long-lived token is now saved and will be used automatically');
    console.log('2. The token will auto-refresh when it expires in ~60 days');
    console.log('3. You can check token status at: /api/facebook/token-status');
    console.log('4. To manually refresh: /api/facebook/refresh-token');
    
    console.log('\n🔒 IMPORTANT SECURITY NOTES:');
    console.log('══════════════════════════════');
    console.log('• Never commit .facebook-token.json or .env to version control');
    console.log('• Add both files to your .gitignore');
    console.log('• Keep your App Secret secure and never share it');
    
  } catch (error) {
    console.error('Error exchanging token:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the exchange
exchangeToken();