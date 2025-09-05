// Microsoft Graph API Integration for CFO AI
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { createClient } from '~/lib/supabase/server';

// Custom authentication provider for Microsoft Graph
class GraphAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export interface OutlookCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
}

export interface OutlookMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  receivedDateTime: string;
  bodyPreview: string;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  webLink: string;
}

export class MicrosoftGraphClient {
  private client: Client;
  private supabase = createClient();

  constructor(accessToken: string) {
    const authProvider = new GraphAuthProvider(accessToken);
    this.client = Client.initWithMiddleware({ authProvider });
  }

  /**
   * Get user's mailbox folders
   */
  async getMailFolders() {
    try {
      const response = await this.client
        .api('/me/mailFolders')
        .select('id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount')
        .get();
      
      return response.value;
    } catch (error) {
      console.error('Error fetching mail folders:', error);
      throw new Error('Failed to fetch mail folders');
    }
  }

  /**
   * Get messages from a specific folder
   */
  async getMessagesFromFolder(
    folderId: string = 'inbox',
    options: {
      top?: number;
      skip?: number;
      filter?: string;
      orderby?: string;
    } = {}
  ): Promise<OutlookMessage[]> {
    try {
      let request = this.client
        .api(`/me/mailFolders/${folderId}/messages`)
        .select([
          'id',
          'subject',
          'from',
          'toRecipients',
          'receivedDateTime',
          'bodyPreview',
          'hasAttachments',
          'webLink'
        ].join(','));

      if (options.top) request = request.top(options.top);
      if (options.skip) request = request.skip(options.skip);
      if (options.filter) request = request.filter(options.filter);
      if (options.orderby) request = request.orderby(options.orderby);

      const response = await request.get();
      return response.value;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  /**
   * Get message attachments
   */
  async getMessageAttachments(messageId: string): Promise<EmailAttachment[]> {
    try {
      const response = await this.client
        .api(`/me/messages/${messageId}/attachments`)
        .select('id,name,contentType,size')
        .get();

      return response.value;
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw new Error('Failed to fetch message attachments');
    }
  }

  /**
   * Download attachment content
   */
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      const response = await this.client
        .api(`/me/messages/${messageId}/attachments/${attachmentId}/$value`)
        .get();

      if (response instanceof ArrayBuffer) {
        return Buffer.from(response);
      } else if (typeof response === 'string') {
        return Buffer.from(response, 'base64');
      } else {
        throw new Error('Unexpected attachment response format');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw new Error('Failed to download attachment');
    }
  }

  /**
   * Create webhook subscription for email notifications
   */
  async createEmailSubscription(
    webhookUrl: string,
    folderId: string = 'inbox',
    expirationDateTime?: string
  ) {
    try {
      // Default to 24 hours from now if no expiration provided
      const expiration = expirationDateTime || 
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const subscription = {
        changeType: 'created',
        notificationUrl: webhookUrl,
        resource: `/me/mailFolders/${folderId}/messages`,
        expirationDateTime: expiration,
        clientState: Math.random().toString(36).substring(7), // Random validation token
      };

      const response = await this.client
        .api('/subscriptions')
        .post(subscription);

      return response;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create email subscription');
    }
  }

  /**
   * Update webhook subscription
   */
  async updateSubscription(subscriptionId: string, expirationDateTime: string) {
    try {
      const response = await this.client
        .api(`/subscriptions/${subscriptionId}`)
        .patch({
          expirationDateTime,
        });

      return response;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Delete webhook subscription
   */
  async deleteSubscription(subscriptionId: string) {
    try {
      await this.client
        .api(`/subscriptions/${subscriptionId}`)
        .delete();

      return true;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw new Error('Failed to delete subscription');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile() {
    try {
      const response = await this.client
        .api('/me')
        .select('id,displayName,mail,userPrincipalName')
        .get();

      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }
}

/**
 * OAuth 2.0 configuration for Microsoft Graph
 */
export const MICROSOFT_GRAPH_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
  scope: [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.ReadWrite',
    'https://graph.microsoft.com/User.Read',
    'offline_access'
  ].join(' '),
  authority: 'https://login.microsoftonline.com/common',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
};

/**
 * Generate Microsoft OAuth authorization URL
 */
export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_GRAPH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: MICROSOFT_GRAPH_CONFIG.redirectUri,
    scope: MICROSOFT_GRAPH_CONFIG.scope,
    response_mode: 'query',
    state: state,
  });

  return `${MICROSOFT_GRAPH_CONFIG.authEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<OutlookCredentials> {
  const params = new URLSearchParams({
    client_id: MICROSOFT_GRAPH_CONFIG.clientId,
    client_secret: MICROSOFT_GRAPH_CONFIG.clientSecret,
    code: code,
    redirect_uri: MICROSOFT_GRAPH_CONFIG.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(MICROSOFT_GRAPH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const tokenData = await response.json();
  
  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
    scope: tokenData.scope,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OutlookCredentials> {
  const params = new URLSearchParams({
    client_id: MICROSOFT_GRAPH_CONFIG.clientId,
    client_secret: MICROSOFT_GRAPH_CONFIG.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(MICROSOFT_GRAPH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const tokenData = await response.json();
  
  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
    expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
    scope: tokenData.scope,
  };
}