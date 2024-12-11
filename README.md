# Salesforce Auth for Expo React Native

A React Native authentication library for Salesforce OAuth 2.0 with PKCE support, built specifically for Expo applications.

## Features

- OAuth 2.0 authentication with PKCE
- Secure token storage
- TypeScript support
- Platform-specific storage handling (web/mobile)
- Built-in hooks and context providers
- User information retrieval
- Salesforce REST API client

## Installation

```bash
npm install @dipakparmar/salesforce-auth-expo

# or with yarn
yarn add @dipakparmar/salesforce-auth-expo

# or with pnpm
pnpm add @dipakparmar/salesforce-auth-expo
```

### Dependencies

This package requires the following peer dependencies, you need to install them manually on your project:

```bash
npm install @react-native-async-storage/async-storage expo-auth-session expo-crypto expo-secure-store expo-web-browser react-native
```

```json
{
  "@react-native-async-storage/async-storage": "^2.1.0",
  "expo-auth-session": "^6.0.0",
  "expo-crypto": "^14.0.1",
  "expo-secure-store": "^14.0.0",
  "expo-web-browser": "^14.0.1",
  "react-native": ">=0.76.3 <1"
}
```

## Usage

1. Wrap your app with SalesforceAuthProvider:

```jsx
import { SalesforceAuthProvider, type SalesforceConfig, type GeneralAuthConfig } from "@dipakparmar/salesforce-auth-expo";

const config: SalesforceConfig & GeneralAuthConfig = {
  clientId: "YOUR_SALESFORCE_CLIENT_ID",
  clientSecret: "YOUR_SALESFORCE_CLIENT_SECRET", // Optional: Only needed for web platforms
  redirectUri: "myapp://callback", // Optional: Defaults to myapp://
  sandbox: false, // Optional: Set to true for sandbox environment
};

export default function App() {
  return (
    <SalesforceAuthProvider config={config}>
      <YourApp />
    </SalesforceAuthProvider>
  );
}
```

2. Use the auth hook in your components:

```jsx
import { useSalesforceAuth } from "@dipakparmar/salesforce-auth-expo";

function AuthComponent() {
  const { isAuthenticated, isInitialized, signIn, signOut, getUserInfo } =
    useSalesforceAuth();

  const handleLogin = async () => {
    try {
      await signIn();
      const userInfo = await getUserInfo();
      console.log("User info:", userInfo);
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  if (!isInitialized) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      {isAuthenticated ? (
        <Button title="Sign Out" onPress={signOut} />
      ) : (
        <Button title="Sign In" onPress={handleLogin} />
      )}
    </View>
  );
}
```

## REST API Usage

The library provides a REST API client for interacting with Salesforce data. Access it using the `getRestClient()` method from the auth hook:

```jsx
import { useSalesforceAuth } from "@dipakparmar/salesforce-auth-expo";

function SalesforceDataComponent() {
  const { getRestClient } = useSalesforceAuth();

  const fetchAccounts = async () => {
    try {
      const client = await getRestClient();
      
      // Query records
      const result = await client.query<Account>('SELECT Id, Name FROM Account LIMIT 10');
      console.log('Accounts:', result.records);
      
      // Create a record
      const newAccount = await client.create<Account>('Account', {
        Name: 'New Account'
      });
      
      // Update a record
      await client.update<Account>('Account', newAccount.id, {
        Name: 'Updated Account'
      });
      
      // Delete a record
      await client.delete('Account', newAccount.id);
      
      // Retrieve a single record
      const account = await client.retrieve<Account>('Account', newAccount.id, ['Name', 'Industry']);
      
      // Get object metadata
      const metadata = await client.describe<AccountMetadata>('Account');
      
    } catch (error) {
      console.error('API error:', error);
    }
  };

  return (
    <Button title="Fetch Accounts" onPress={fetchAccounts} />
  );
}

interface Account {
  Id: string;
  Name: string;
  Industry?: string;
}
```

## License

MIT

## Credits

- [expo-auth-session](https://github.com/expo/expo/tree/main/packages/expo-auth-session)
- [logto/rn](https://github.com/logto-io/react-native/tree/master/packages/rn)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
