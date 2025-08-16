import { Request, Response } from 'express';
import { 
  exchangeForLongLivedToken, 
  getValidToken, 
  getTokenExpiryInfo,
  loadStoredToken,
  verifyToken 
} from './facebook-auth';

/**
 * Exchange a short-lived token for a long-lived token
 */
export async function exchangeToken(req: Request, res: Response) {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token is required' 
      });
    }

    const tokenInfo = await exchangeForLongLivedToken(token);
    const expiryInfo = getTokenExpiryInfo();

    res.json({
      success: true,
      message: 'Token exchanged successfully',
      expires_at: tokenInfo.expires_at,
      expires_in_days: expiryInfo?.days_remaining || 60,
      token_stored: true
    });
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to exchange token'
    });
  }
}

/**
 * Get current token status and expiry information
 */
export async function getTokenStatus(req: Request, res: Response) {
  try {
    const stored = loadStoredToken();
    
    if (!stored) {
      return res.json({
        success: false,
        message: 'No stored token found',
        has_token: false
      });
    }

    const isValid = await verifyToken(stored.access_token);
    const expiryInfo = getTokenExpiryInfo();

    res.json({
      success: true,
      has_token: true,
      is_valid: isValid,
      expires_at: expiryInfo?.expires_at,
      days_remaining: expiryInfo?.days_remaining,
      last_refreshed: new Date(stored.last_refreshed),
      needs_refresh: expiryInfo ? expiryInfo.days_remaining < 7 : false
    });
  } catch (error: any) {
    console.error('Error getting token status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get token status'
    });
  }
}

/**
 * Manually refresh the current token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const newToken = await getValidToken();
    const expiryInfo = getTokenExpiryInfo();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_at: expiryInfo?.expires_at,
      days_remaining: expiryInfo?.days_remaining
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh token'
    });
  }
}