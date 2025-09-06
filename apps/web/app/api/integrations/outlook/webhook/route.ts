import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { MicrosoftGraphClient } from '~/lib/microsoft/graph-client';

interface WebhookNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: string;
  resource: string;
  resourceData: {
    id: string;
    '@odata.type': string;
    '@odata.id': string;
  };
  clientState: string;
  tenantId: string;
}

interface ValidationRequest {
  validationToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const { searchParams } = new URL(request.url);
    const validationToken = searchParams.get('validationToken');
    
    // Handle subscription validation
    if (validationToken) {
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    // Handle webhook notifications
    if (!body) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    
    const notifications = JSON.parse(body);
    
    // Process each notification
    for (const notification of notifications.value || [notification]) {
      await processEmailNotification(notification);
    }
    
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processEmailNotification(notification: WebhookNotification) {
  const supabase = getSupabaseServerClient();
  
  try {
    // Find the integration associated with this subscription
    const { data: integration, error: integrationError } = await supabase
      .from('outlook_integrations')
      .select('*')
      .eq('subscription_id', notification.subscriptionId)
      .eq('status', 'active')
      .single();
    
    if (integrationError || !integration) {
      console.error('Integration not found for subscription:', notification.subscriptionId);
      return;
    }
    
    // Extract message ID from resource path
    const messageId = notification.resourceData.id;
    if (!messageId) {
      console.error('No message ID in notification:', notification);
      return;
    }
    
    // Initialize Graph client with stored access token
    const graphClient = new MicrosoftGraphClient(integration.access_token);
    
    try {
      // Fetch the new message details
      const message = await graphClient.getMessagesFromFolder('inbox', {
        filter: `id eq '${messageId}'`,
        top: 1,
      });
      
      if (!message || message.length === 0) {
        console.error('Message not found:', messageId);
        return;
      }
      
      const emailMessage = message[0];
      
      // Store the message in our database
      const { data: storedMessage, error: messageError } = await supabase
        .from('mail_messages')
        .insert({
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          message_id: messageId,
          subject: emailMessage.subject || '',
          sender_email: emailMessage.from?.emailAddress?.address || '',
          sender_name: emailMessage.from?.emailAddress?.name || '',
          received_at: emailMessage.receivedDateTime,
          body_preview: emailMessage.bodyPreview || '',
          has_attachments: emailMessage.hasAttachments || false,
          web_link: emailMessage.webLink,
          status: 'received',
          processed: false,
        })
        .select('id')
        .single();
      
      if (messageError) {
        console.error('Error storing message:', messageError);
        return;
      }
      
      // If message has attachments, process them
      if (emailMessage.hasAttachments) {
        await processEmailAttachments(
          graphClient, 
          messageId, 
          storedMessage.id, 
          integration.tenant_id
        );
      }
      
    } catch (graphError) {
      // If access token expired, try to refresh it
      if (graphError instanceof Error && graphError.message.includes('401')) {
        await refreshIntegrationToken(integration.id);
      }
      throw graphError;
    }
    
  } catch (error) {
    console.error('Error processing email notification:', error);
  }
}

async function processEmailAttachments(
  graphClient: MicrosoftGraphClient,
  messageId: string,
  storedMessageId: string,
  tenantId: string
) {
  const supabase = getSupabaseServerClient();
  
  try {
    const attachments = await graphClient.getMessageAttachments(messageId);
    
    for (const attachment of attachments) {
      // Only process document attachments (PDF, XML, images)
      const supportedTypes = [
        'application/pdf',
        'application/xml',
        'text/xml',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'application/zip'
      ];
      
      if (!supportedTypes.includes(attachment.contentType)) {
        continue;
      }
      
      // Download attachment content
      const content = await graphClient.downloadAttachment(messageId, attachment.id);
      
      // Generate storage path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `${tenantId}/email-attachments/${timestamp}-${attachment.name}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, content, {
          contentType: attachment.contentType,
        });
      
      if (uploadError) {
        console.error('Error uploading attachment:', uploadError);
        continue;
      }
      
      // Store file record
      const { data: fileRecord, error: fileError } = await supabase
        .from('files')
        .insert({
          tenant_id: tenantId,
          filename: attachment.name,
          original_filename: attachment.name,
          mime_type: attachment.contentType,
          file_size: attachment.size,
          storage_path: storagePath,
          source: 'email',
          source_reference: storedMessageId,
          status: 'uploaded',
        })
        .select('id')
        .single();
      
      if (fileError) {
        console.error('Error storing file record:', fileError);
        continue;
      }
      
      // Create processing job for the attachment
      await supabase
        .from('processing_jobs')
        .insert({
          tenant_id: tenantId,
          file_id: fileRecord.id,
          message_id: storedMessageId,
          job_type: 'email_attachment',
          status: 'queued',
          priority: 1, // Higher priority for email attachments
          attempts: 0,
          max_attempts: 3,
          progress_data: {
            stage: 'queued',
            progress: 0,
            message: `Processing email attachment: ${attachment.name}`,
            timestamp: new Date().toISOString(),
          },
        });
    }
    
    // Mark message as having processed attachments
    await supabase
      .from('mail_messages')
      .update({ 
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', storedMessageId);
      
  } catch (error) {
    console.error('Error processing email attachments:', error);
  }
}

async function refreshIntegrationToken(integrationId: string) {
  const supabase = getSupabaseServerClient();
  
  try {
    const { data: integration } = await supabase
      .from('outlook_integrations')
      .select('refresh_token')
      .eq('id', integrationId)
      .single();
    
    if (!integration?.refresh_token) {
      throw new Error('No refresh token available');
    }
    
    const { refreshAccessToken } = await import('~/lib/microsoft/graph-client');
    const newCredentials = await refreshAccessToken(integration.refresh_token);
    
    await supabase
      .from('outlook_integrations')
      .update({
        access_token: newCredentials.access_token,
        refresh_token: newCredentials.refresh_token,
        expires_at: newCredentials.expires_at,
      })
      .eq('id', integrationId);
      
  } catch (error) {
    console.error('Error refreshing integration token:', error);
    
    // Mark integration as expired
    await supabase
      .from('outlook_integrations')
      .update({ status: 'expired' })
      .eq('id', integrationId);
  }
}