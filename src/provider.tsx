import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { SalesforceAuthClient, type SalesforceConfig } from './client';
import { SalesforceAuthContext } from './context';

export type SalesforceAuthProviderProps = {
  config: SalesforceConfig;
  children?: ReactNode;
};

export const SalesforceAuthProvider = ({ config, children }: SalesforceAuthProviderProps) => {
  const memorizedClient = useMemo(() => new SalesforceAuthClient(config), [config]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      const isAuthenticated = await memorizedClient.isAuthenticated();
      setIsAuthenticated(isAuthenticated);
      setIsInitialized(true);
    })();
  }, [memorizedClient]);

  const contextValue = useMemo(
    () => ({
      client: memorizedClient,
      isAuthenticated,
      isInitialized,
      setIsAuthenticated,
    }),
    [memorizedClient, isAuthenticated, isInitialized]
  );

  return (
    <SalesforceAuthContext.Provider value={contextValue}>
      {children}
    </SalesforceAuthContext.Provider>
  );
};
