# Salesforce Auth for Expo React Native

A React Native authentication library for Salesforce OAuth 2.0 with PKCE support, built specifically for Expo applications.

## Features

- OAuth 2.0 authentication with PKCE
- Secure token storage
- TypeScript support
- Platform-specific storage handling (web/mobile)
- Built-in hooks and context providers
- User information retrieval

## Installation

```bash
npm install @dipakparmar/salesforce-auth-expo

# or with yarn
yarn add @dipakparmar/salesforce-auth-expo

# or with pnpm
pnpm add @dipakparmar/salesforce-auth-expo
```

### Dependencies

This package requires the following peer dependencies:

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
import { SalesforceAuthProvider } from "@dipakparmar/salesforce-auth-expo";

const config = {
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

## License

MIT

## Credits

- [expo-auth-session](https://github.com/expo/expo/tree/main/packages/expo-auth-session)
- [logto/rn](https://github.com/logto-io/react-native/tree/master/packages/rn)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
