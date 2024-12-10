import { useCallback, useContext, useEffect, useMemo } from "react";

import { SalesforceAuthContext } from "./context";
import type { UserInfo } from "./client";
import { maybeCompleteAuthSession } from "expo-web-browser";

export const useSalesforceAuth = () => {
  const { client, isAuthenticated, setIsAuthenticated, isInitialized } =
    useContext(SalesforceAuthContext);

  useEffect(() => {
    maybeCompleteAuthSession();
  }, []);

  const signIn = useCallback(async () => {
    await client.signIn();
    setIsAuthenticated(true);
  }, [client, setIsAuthenticated]);

  const signOut = useCallback(async () => {
    await client.signOut();
    setIsAuthenticated(false);
  }, [client, setIsAuthenticated]);

  const getUserInfo = useCallback(async (): Promise<UserInfo> => {
    return client.getUserInfo();
  }, [client]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return client.getAccessToken();
  }, [client]);

  return useMemo(
    () => ({
      client,
      isAuthenticated,
      isInitialized,
      signIn,
      signOut,
      getUserInfo,
      getAccessToken,
    }),
    [
      client,
      isAuthenticated,
      isInitialized,
      signIn,
      signOut,
      getUserInfo,
      getAccessToken,
    ]
  );
};
