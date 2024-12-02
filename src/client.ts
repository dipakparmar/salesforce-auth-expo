import * as WebBrowser from "expo-web-browser";
import { BrowserStorage, SecureStorage, type PersistKey } from "./storage";
import { generateCodeChallenge, generateRandomString } from "./utils";
import { Platform } from "react-native";
import { SalesforceAuthError } from "./errors";
import { makeRedirectUri } from "expo-auth-session";

/**
 * Configuration interface for Salesforce authentication.
 * Defines the required and optional parameters for setting up Salesforce OAuth.
 */
export interface SalesforceConfig {
  /** 
   * The client ID obtained from Salesforce Connected App.
   * This is required for all authentication flows.
   */
  clientId: string;
  
  /**
   * The client secret obtained from Salesforce Connected App.
   * Optional for mobile apps using PKCE flow, required for web applications.
   */
  clientSecret?: string;
  
  /**
   * Custom redirect URI for the OAuth flow.
   * If not provided, defaults to a URI generated by expo-auth-session.
   */
  redirectUri?: string;
  
  /**
   * Whether to use Salesforce sandbox environment.
   * Set to true to use test.salesforce.com instead of login.salesforce.com.
   * @default false
   */
  sandbox?: boolean;
}

/**
 * Informs the server if the user should be prompted to login or consent again.
 * This can be used to present a dialog for switching accounts after the user has already been logged in.
 * You should use this in favor of clearing cookies (which is mostly not possible on iOS).
 * Copied from https://github.com/expo/expo/blob/main/packages/expo-auth-session/src/AuthRequest.types.ts
 * @see [Section 3.1.2.1](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationRequest).
 */
export enum Prompt {
  /**
   * Server must not display any auth or consent UI. Can be used to check for existing auth or consent.
   * An error is returned if a user isn't already authenticated or the client doesn't have pre-configured consent for the requested claims.
   */
  None = "none",
  
  /**
   * The server should prompt the user to reauthenticate.
   * If it cannot reauthenticate the End-User, it must return an error, typically `login_required`.
   */
  Login = "login",
  
  /**
   * Server should prompt the user for consent before returning information to the client.
   * If it cannot obtain consent, it must return an error, typically `consent_required`.
   */
  Consent = "consent",
  
  /**
   * Server should prompt the user to select an account. Can be used to switch accounts.
   * If it can't obtain an account selection choice made by the user, it must return an error.
   */
  SelectAccount = "select_account",
}

/**
 * Configuration interface for general authentication settings.
 * Defines authentication behavior and UI preferences.
 */
export interface GeneralAuthConfig {
  /**
   * Not implemented yet.
   * The prompt to be used for the authentication request. This can be used to skip the login or
   * consent screen when the user has already granted the required permissions.
   * 
   * @see {@link https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest | OpenID Connect Core 1.0}
   * @default [Prompt.Login, Prompt.Consent]
   */
  prompt?: Prompt | Prompt[];

  /**
   * **Only for iOS**
   * 
   * Determines whether the session should ask the browser for a private authentication session.
   * Set this to true to request that the browser doesn't share cookies or other browsing data
   * between the authentication session and the user's normal browser session.
   * 
   * @default true
   */
  perferEphemeralSession?: boolean;
}

/**
 * Interface representing the user information returned by Salesforce.
 * Contains basic profile information about the authenticated user.
 */
export interface UserInfo {
  /** The full name of the user */
  name: string;
  
  /** The email address of the user */
  email: string;
  
  /** URL to the user's profile picture */
  picture: string;
  
  /** The username preferred by the user */
  preferred_username: string;
  
  /** URL to the user's profile */
  profile: string;
}

/**
 * Main class for handling Salesforce authentication flows.
 * Provides methods for authentication, token management, and user information retrieval.
 * Supports both web and mobile platforms using appropriate storage mechanisms.
 */
export class SalesforceAuthClient {
  protected storage: SecureStorage | BrowserStorage;
  private authEndpoint: string;
  private tokenEndpoint: string;
  private revocationEndpoint: string;
  private userInfoEndpoint: string;
  private authSessionResult?: WebBrowser.WebBrowserAuthSessionResult;
  private prompt: Prompt | Prompt[] = [Prompt.Login, Prompt.Consent];
  private preferEphemeralSession = true;

  /**
   * Creates a new instance of SalesforceAuthClient.
   * Initializes endpoints and storage based on platform and configuration.
   * 
   * @param config - Combined configuration for Salesforce and general auth settings
   */
  constructor(private config: SalesforceConfig & GeneralAuthConfig) {
    this.storage =
      Platform.OS === "web"
        ? new BrowserStorage(config.clientId)
        : new SecureStorage(`salesforce.${config.clientId}`);

    const domain = config.sandbox
      ? "test.salesforce.com"
      : "login.salesforce.com";
    this.authEndpoint = `https://${domain}/services/oauth2/authorize`;
    this.tokenEndpoint = `https://${domain}/services/oauth2/token`;
    this.revocationEndpoint = `https://${domain}/services/oauth2/revoke`;
    this.userInfoEndpoint = `https://${domain}/services/oauth2/userinfo`;
    this.prompt = config.prompt ?? this.prompt;
    this.preferEphemeralSession =
      config.perferEphemeralSession ?? this.preferEphemeralSession;
  }

  /**
   * Initiates the sign-in flow using OAuth 2.0 with PKCE.
   * Opens a web browser for authentication and handles the callback.
   * 
   * @throws {SalesforceAuthError} When authentication fails or state validation fails
   * @returns Promise that resolves when sign-in is complete
   */
  async signIn(): Promise<void> {
    const codeVerifier = await generateRandomString();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = await generateRandomString(16);

    const redirectUri =
      this.config.redirectUri ?? makeRedirectUri({ scheme: "myapp" });

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    this.authSessionResult = await WebBrowser.openAuthSessionAsync(
      `${this.authEndpoint}?${params.toString()}`,
      redirectUri,
      { preferEphemeralSession: this.preferEphemeralSession }
    );

    if (this.authSessionResult.type !== "success") {
      throw new SalesforceAuthError("auth_session_failed");
    }

    const response = new URL(this.authSessionResult.url);
    const code = response.searchParams.get("code");
    const returnedState = response.searchParams.get("state");

    if (!code || returnedState !== state) {
      throw new SalesforceAuthError("invalid_state");
    }

    await this.exchangeCodeForToken(code, codeVerifier, redirectUri);
  }

  /**
   * Signs out the current user by revoking the access token and clearing stored credentials.
   * Makes a request to Salesforce's revocation endpoint and cleans up local storage.
   * 
   * @returns Promise that resolves when sign-out is complete
   */
  async signOut(): Promise<void> {
    const token = await this.storage.getItem(
      "accessToken" as PersistKey.AccessToken
    );
    if (token) {
      const params = new URLSearchParams({
        token,
        client_id: this.config.clientId,
        ...(this.config.clientSecret && {
          client_secret: this.config.clientSecret,
        }),
      });

      await fetch(this.revocationEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      await this.storage.removeItem("accessToken" as PersistKey.AccessToken);
      await this.storage.removeItem("refreshToken" as PersistKey.RefreshToken);
    }
  }

  /**
   * Retrieves the user information from Salesforce using the current access token.
   * Makes a request to Salesforce's userinfo endpoint.
   * 
   * @throws {SalesforceAuthError} When user is not authenticated or request fails
   * @returns Promise that resolves with the user information
   */
  async getUserInfo(): Promise<UserInfo> {
    const token = await this.storage.getItem(
      "accessToken" as PersistKey.AccessToken
    );
    if (!token) {
      throw new SalesforceAuthError("not_authenticated");
    }

    const response = await fetch(this.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new SalesforceAuthError("userinfo_request_failed");
    }

    return response.json();
  }

  /**
   * Checks if the user is currently authenticated by verifying the presence of an access token.
   * 
   * @returns Promise that resolves to true if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    return Boolean(
      await this.storage.getItem("accessToken" as PersistKey.AccessToken)
    );
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   * Makes a request to Salesforce's token endpoint using the PKCE code verifier.
   * 
   * @param code - The authorization code received from the OAuth callback
   * @param codeVerifier - The PKCE code verifier used in the initial request
   * @param redirectUri - The redirect URI used in the initial request
   * @throws {SalesforceAuthError} When token exchange fails
   * @returns Promise that resolves when token exchange is complete
   * @private
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<void> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      ...(this.config.clientSecret && {
        client_secret: this.config.clientSecret,
      }),
    });

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new SalesforceAuthError("token_exchange_failed");
    }

    const data = await response.json();
    await this.storage.setItem(
      "accessToken" as PersistKey.AccessToken,
      data.access_token
    );
    if (data.refresh_token) {
      await this.storage.setItem(
        "refreshToken" as PersistKey.RefreshToken,
        data.refresh_token
      );
    }
  }
}