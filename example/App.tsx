import { Button, StyleSheet, Text, View } from "react-native";
import {
  SalesforceAuthProvider,
  useSalesforceAuth,
  type UserInfo,
  type SalesforceConfig,
  type GeneralAuthConfig
} from "../src";
import React from "react";

const config: SalesforceConfig & GeneralAuthConfig = {
  clientId: "YOUR_SALESFORCE_CLIENT_ID",
  clientSecret: "YOUR_SALESFORCE_CLIENT_SECRET",
  redirectUri: "myapp://callback",
};

// Define Salesforce object types
interface Account {
  Id?: string;
  Name: string;
  Industry?: string;
  CreatedDate?: string;
}

function AuthContent() {
  const { isAuthenticated, isInitialized, signIn, signOut, getUserInfo, client } =
    useSalesforceAuth();
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleGetUserInfo = async () => {
    try {
      const info = await getUserInfo();  // Use getUserInfo from hook
      setUserInfo(info);
    } catch (error) {
      console.error("Failed to get user info:", error);
    }
  };

  const handleFetchAccounts = async () => {
    try {
      setLoading(true);
      const restClient = await client.getRestClient();
      const result = await restClient.query<Account>(
        "SELECT Id, Name, Industry, CreatedDate FROM Account ORDER BY CreatedDate DESC LIMIT 5"
      );
      setAccounts(result.records);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setLoading(true);
      const restClient = await client.getRestClient();
      const newAccount = await restClient.create<Account>("Account", {
        Name: `Test Account ${new Date().toISOString()}`,
        Industry: "Technology"
      });
      console.log("Created account:", newAccount);
      // Refresh accounts list
      handleFetchAccounts();
    } catch (error) {
      console.error("Failed to create account:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        Status: {isAuthenticated ? "Authenticated" : "Not authenticated"}
      </Text>

      {!isAuthenticated ? (
        <Button title="Sign In" onPress={signIn} />
      ) : (
        <View style={styles.content}>
          <Button title="Sign Out" onPress={signOut} />
          <Button title="Get User Info" onPress={handleGetUserInfo} />
          <Button title="Fetch Accounts" onPress={handleFetchAccounts} />
          <Button title="Create Test Account" onPress={handleCreateAccount} />

          {loading && <Text>Loading data...</Text>}

          {userInfo && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>User Info</Text>
              <Text>Name: {userInfo.name}</Text>
              <Text>Email: {userInfo.email}</Text>
              <Text>Username: {userInfo.preferred_username}</Text>
            </View>
          )}

          {accounts.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Recent Accounts</Text>
              {accounts.map((account) => (
                <View key={account.Id} style={styles.accountItem}>
                  <Text>Name: {account.Name}</Text>
                  <Text>Industry: {account.Industry || 'N/A'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SalesforceAuthProvider config={config}>
      <AuthContent />
    </SalesforceAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  status: {
    fontSize: 18,
    marginBottom: 20,
  },
  userInfo: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  content: {
    width: '100%',
    gap: 10,
  },
  infoCard: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  accountItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
