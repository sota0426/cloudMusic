import { useOneDrive } from "@/provider/useOneDrive";
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";

interface MicrosoftSignInScreenProps{
  onAuthSuccess:()=>void;
};

export default function MicrosoftSignInScreen({
  onAuthSuccess
}:MicrosoftSignInScreenProps){
  const{
    microsoftUserInfo,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    request,
    response
  } = useOneDrive();

  useEffect(()=>{
    if(isAuthenticated){
      onAuthSuccess();
    }
  },[isAuthenticated,onAuthSuccess]);

 // --- UI ---
  return (
    <View className="flex-1 px-5 items-center justify-center">
      {/* ヘッダー */}
      <Text className="text-2xl font-bold mb-8 text-blue-600">
        <Entypo name="cloud" size={24} /> {/* OneDriveっぽいアイコン */}
        <Text className="pl-2">Microsoft / OneDrive 認証</Text>
      </Text>

      {/* ローディングインジケータ */}
      {loading && <ActivityIndicator size="large" color="#0078d4" />}

      {/* エラーメッセージ表示 (useOneDrive の response を利用) */}
      {response && response.type === "error" && (
        <View className="my-3 p-3 bg-gray-200 rounded w-full">
          <Text>Response Type: {response.type}</Text>
          <Text className="text-red-500 mt-1">
            Error: {response.error?.message}
          </Text>
        </View>
      )}

      {/* 認証済みUI */}
      {isAuthenticated ? (
        <>
          {/* ユーザー情報表示 */}
          <View className="w-full my-5 p-4 bg-blue-100 border border-blue-500 rounded">
            <Text className="font-bold text-lg mb-2">ユーザー情報</Text>
            <Text>名前: {microsoftUserInfo?.displayName}</Text>
            <Text>
              メール:{" "}
              {microsoftUserInfo?.mail || microsoftUserInfo?.userPrincipalName}
            </Text>
            <Text className="text-green-600 font-bold mt-1">
              ✓ 認証成功
            </Text>
          </View>

          {/* ログアウトボタン */}
          <View className="w-full my-3">
            <Button
              title="ログアウト"
              onPress={signOut} // useOneDriveのsignOutを使用
              color="red"
              disabled={loading}
            />
          </View>
        </>
      ) : (
        /* 未認証UI */
        <View className="w-full my-3">
          <Button
            title="Sign in with Microsoft"
            onPress={signIn} // useOneDriveのsignInを使用
            disabled={!request || loading}
            color="#0078d4" // Microsoftのコーポレートカラー
          />
        </View>
      )}
    </View>
  );
}