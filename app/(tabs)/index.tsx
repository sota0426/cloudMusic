import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Button, Text, View } from "react-native";
// import GoogleSignInScreen from "../../components/login/SignIn_Google";

export default function Test() {

// 認証セッションを完了
WebBrowser.maybeCompleteAuthSession();

// --- 型定義 ---
interface MicrosoftUser {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  id?: string;
}

interface StoredAuth {
  user: MicrosoftUser;
  accessToken: string;
  expiresAt: number;
}

interface MicrosoftSignInScreenProps {
  onAuthSuccess: () => void;
}

// --- 定数 ---
const MICROSOFT_AUTH_STORAGE_KEY = "@microsoftAuth";

  const [microsoftUserInfo, setMicrosoftUserInfo] =
    useState<MicrosoftUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Microsoft Entra ID (旧 Azure AD) の設定
  const clientId = "0f7f6cf5-7f64-4ed5-bbff-3f0cb8796763";
  const tenantId = "9c88b83f-6b00-42a9-a985-8091fbea96f3";

  const discovery = {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };

    const redirectUri =()=>{

    const uri=AuthSession.makeRedirectUri();
    console.log("******************************")
    console.log("Redirect URI:", uri);
    console.log("******************************")
    }

  return(
    <View className="flex items-center justify-center">
      <Text  className="text-white">
        heloo
      </Text>
      <Button 
        title="button"
        onPress={()=>redirectUri()}
      />
    </View>
  )
}
