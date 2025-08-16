import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import { facebookTokens } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_API_VERSION = 'v18.0';

interface TokenInfo {
  access_token: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
}

interface TokenStorage {
  access_token: string;
  expires_at: number;
  last_refreshed: number;
}

// For local development, still support file storage as fallback
const TOKEN_STORAGE_PATH = path.join(process.cwd(), '.facebook-token.json');
const USE_DATABASE = process.env.NODE_ENV === 'production' || process.env.USE_DB_FOR_TOKENS === 'true';

/**
 * Exchange a short-lived token for a long-lived token
 * Long-lived tokens last about 60 days
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenInfo> {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    throw new Error('Facebook App ID and App Secret are required. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.');
  }

  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`;
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: shortLivedToken
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    // Calculate expiry time (expires_in is in seconds)
    const expiresAt = Date.now() + (data.expires_in || 5184000) * 1000; // Default to 60 days

    const tokenInfo: TokenInfo = {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in,
      expires_at: expiresAt
    };

    // Store the token
    await storeToken(tokenInfo);

    return tokenInfo;
  } catch (error: any) {
    console.error('Error exchanging for long-lived token:', error);
    throw error;
  }
}

/**
 * Refresh a long-lived page access token
 * This extends the token for another 60 days
 */
export async function refreshLongLivedToken(currentToken: string): Promise<TokenInfo> {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    throw new Error('Facebook App ID and App Secret are required');
  }

  // First, verify the current token is still valid
  const isValid = await verifyToken(currentToken);
  if (!isValid) {
    throw new Error('Current token is invalid or expired');
  }

  // Exchange the current token for a new one
  return exchangeForLongLivedToken(currentToken);
}

/**
 * Verify if a token is still valid
 */
export async function verifyToken(token: string): Promise<boolean> {
  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token`;
  const params = new URLSearchParams({
    input_token: token,
    access_token: token // Can use the same token to debug itself
  });

  try {
    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.error) {
      return false;
    }

    // Check if token is valid and not expired
    const tokenData = data.data;
    if (!tokenData || !tokenData.is_valid) {
      return false;
    }

    // Check expiry time if available
    if (tokenData.expires_at) {
      const expiresAt = tokenData.expires_at * 1000; // Convert to milliseconds
      if (expiresAt < Date.now()) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

/**
 * Store token information to database or file
 */
async function storeToken(tokenInfo: TokenInfo): Promise<void> {
  const expiresAt = new Date(tokenInfo.expires_at || Date.now() + 5184000000); // Default 60 days
  
  if (USE_DATABASE) {
    try {
      // Check if a token already exists
      const existing = await db.select()
        .from(facebookTokens)
        .orderBy(desc(facebookTokens.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing token
        await db.update(facebookTokens)
          .set({
            accessToken: tokenInfo.access_token,
            tokenType: tokenInfo.token_type,
            expiresAt: expiresAt,
            lastRefreshed: new Date(),
            updatedAt: new Date()
          })
          .where(eq(facebookTokens.id, existing[0].id));
      } else {
        // Insert new token
        await db.insert(facebookTokens).values({
          accessToken: tokenInfo.access_token,
          tokenType: tokenInfo.token_type,
          expiresAt: expiresAt,
          lastRefreshed: new Date()
        });
      }
      console.log('Token stored in database successfully');
    } catch (error) {
      console.error('Error storing token in database:', error);
      throw error;
    }
  } else {
    // Fallback to file storage for local development
    const storage: TokenStorage = {
      access_token: tokenInfo.access_token,
      expires_at: tokenInfo.expires_at || Date.now() + 5184000000,
      last_refreshed: Date.now()
    };

    try {
      fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(storage, null, 2));
      console.log('Token stored to file successfully');
    } catch (error) {
      console.error('Error storing token to file:', error);
      throw error;
    }
  }
}

/**
 * Load stored token information from database or file
 */
export async function loadStoredToken(): Promise<TokenStorage | null> {
  if (USE_DATABASE) {
    try {
      const tokens = await db.select()
        .from(facebookTokens)
        .orderBy(desc(facebookTokens.id))
        .limit(1);

      if (tokens.length > 0) {
        const token = tokens[0];
        return {
          access_token: token.accessToken,
          expires_at: token.expiresAt.getTime(),
          last_refreshed: token.lastRefreshed.getTime()
        };
      }
    } catch (error) {
      console.error('Error loading token from database:', error);
    }
  } else {
    // Fallback to file storage for local development
    try {
      if (fs.existsSync(TOKEN_STORAGE_PATH)) {
        const data = fs.readFileSync(TOKEN_STORAGE_PATH, 'utf-8');
        return JSON.parse(data) as TokenStorage;
      }
    } catch (error) {
      console.error('Error loading stored token from file:', error);
    }
  }
  
  return null;
}

/**
 * Check if the stored token needs refreshing
 * Refreshes if token expires in less than 7 days
 */
export function needsRefresh(tokenStorage: TokenStorage): boolean {
  const daysUntilExpiry = (tokenStorage.expires_at - Date.now()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry < 7;
}

/**
 * Get the current valid token, refreshing if necessary
 */
export async function getValidToken(): Promise<string> {
  // First try to load from storage
  const stored = await loadStoredToken();
  
  if (stored) {
    // Check if token needs refreshing
    if (needsRefresh(stored)) {
      try {
        console.log('Token expires soon, refreshing...');
        const tokenInfo = await refreshLongLivedToken(stored.access_token);
        return tokenInfo.access_token;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Return existing token if refresh fails
        return stored.access_token;
      }
    }
    return stored.access_token;
  }

  // No stored token, try to get from environment variable
  const envToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!envToken) {
    throw new Error('No Facebook access token available. Please exchange your short-lived token first.');
  }
  
  // Exchange environment token for long-lived token
  console.log('Exchanging environment token for long-lived token...');
  const tokenInfo = await exchangeForLongLivedToken(envToken);
  return tokenInfo.access_token;
}

/**
 * Get token expiry information
 */
export async function getTokenExpiryInfo(): Promise<{ expires_at: Date; days_remaining: number } | null> {
  const stored = await loadStoredToken();
  if (!stored) {
    return null;
  }

  const expiresAt = new Date(stored.expires_at);
  const daysRemaining = Math.floor((stored.expires_at - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    expires_at: expiresAt,
    days_remaining: daysRemaining
  };
}