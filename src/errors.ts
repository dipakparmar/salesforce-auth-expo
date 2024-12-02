const SalesforceAuthErrorCodes = {
  auth_session_failed: "Authentication session failed",
  invalid_state: "Invalid state parameter",
  not_authenticated: "User is not authenticated",
  token_exchange_failed: "Failed to exchange code for token",
  userinfo_request_failed: "Failed to fetch user info",
} as const;

export type SalesforceAuthErrorCode = keyof typeof SalesforceAuthErrorCodes;

export class SalesforceAuthError extends Error {
  constructor(public code: SalesforceAuthErrorCode) {
    super(SalesforceAuthErrorCodes[code]);
    this.name = 'SalesforceAuthError';
  }
}
