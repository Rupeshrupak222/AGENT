export interface ResendCredentials {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

export interface ResendSendPayload {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendSendResponse {
  id: string;
}

export interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}
