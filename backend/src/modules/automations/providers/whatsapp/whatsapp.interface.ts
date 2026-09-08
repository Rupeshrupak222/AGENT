export interface WhatsAppCredentials {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  verifyToken?: string;
  appSecret?: string;
}

export interface MetaWhatsAppPayload {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
  type: 'template' | 'text';
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'image' | 'document';
        text?: string;
        [key: string]: any;
      }>;
    }>;
  };
  text?: {
    body: string;
    preview_url?: boolean;
  };
}

export interface MetaWhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface MetaWhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: 'whatsapp';
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: { body: string };
        type: string;
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<{
          code: number;
          title: string;
          message?: string;
          error_data?: { details: string };
        }>;
      }>;
    };
    field: string;
  }>;
}
