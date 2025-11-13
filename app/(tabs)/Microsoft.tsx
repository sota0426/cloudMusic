
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const MS_CLIENT_ID = "fde2e323-ea39-42aa-a0b7-47bed2084bb2";
const MS_REDIRECT_URI = "msauth://com.iimorisota.googleAuth/MtUCJcA7z4EO0UJGWHSjVHMKf%2Bc%3D";

const msDiscovery = {
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};


export default function MicrosoftSignInScreen() {
  const [microsoftUserInfo , setMicrosoftUserInfo ] = useState(null);
  
  const [microsoftRequest,microsoftResponse,microsoftPromptAsync] = AuthSession.useAuthRequest({
    clientId: MS_CLIENT_ID,
    redirectUri: MS_REDIRECT_URI,
    scopes: ['openid', 'profile', 'User.Read',"Files.Read"],
  }, msDiscovery);

  useEffect(()=>{
    handleSignInWithMicrosoft();
  },[microsoftResponse])


  async function handleSignInWithMicrosoft(){
    const user = await AsyncStorage.getItem("@microsoftUser");
    if(!user){
      if(microsoftResponse?.type === "success"){

        await getMicrosoftUserInfo(microsoftResponse.authentication?.accessToken)
      }
    }else{
      setMicrosoftUserInfo(JSON.parse(user));
    }
  }

  const getMicrosoftUserInfo = async(token:any)=>{
    if(!token) return;
    try{
      const response = await fetch("https://graph.microsoft.com/v1.0/me",{
        headers:{Authorization:`Bearer ${token}`}
      });
      const user = await response.json();
      await AsyncStorage.setItem("@microsoftUser",JSON.stringify(user));
      setMicrosoftUserInfo(user);
    }catch(error){
      console.log("Error fetching Microsoft user info:",error);
    } 
  };
  
  const clearMicrosoftStorage = ()=>{ 
    AsyncStorage.removeItem("@microsoftUser");
    setMicrosoftUserInfo(null);
  }


  return(
    <View style={styles.container}>
      <View>
        <Text>Microsoft</Text>
        {microsoftUserInfo ? (
          <>
            <Text>{JSON.stringify(microsoftUserInfo,null,2)}</Text>
            <Button 
              color="red"
              title="delete local storage" onPress={clearMicrosoftStorage} />
          </>
        ):(
          <Button title="Sign in with OneDrive" onPress={()=>{microsoftPromptAsync()}} />
        )}
      </View>      
    </View>
    
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});