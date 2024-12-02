import type { SalesforceAuthClient } from './client';
import { createContext } from 'react';

export type SalesforceAuthContextProps = {
  client: SalesforceAuthClient;
  /**
   * Indicates if the client is initialized.
   *
   * - `true`: The client is initialized, and the authentication state is fetched.
   * - `false`: The client is not initialized.
   */
  isInitialized: boolean;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
};

export const throwContextError = (): never => {
  throw new Error('Must be used inside <SalesforceAuthProvider> context.');
};

export const SalesforceAuthContext = createContext<SalesforceAuthContextProps>({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  client: undefined!,
  isInitialized: false,
  isAuthenticated: false,
  setIsAuthenticated: throwContextError,
});
