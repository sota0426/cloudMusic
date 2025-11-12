//clientID 927f132e-b18b-47c4-9d84-8225138c02c4
//tenantID 9c88b83f-6b00-42a9-a985-8091fbea96f3

//ios 
// msauth.com.anonymous.googleAuth://auth
// let kClientID = "927f132e-b18b-47c4-9d84-8225138c02c4"
// let kRedirectUri = "msauth.com.anonymous.googleAuth://auth"
// let kAuthority = "https://login.microsoftonline.com/common"
// let kGraphEndpoint = "https://graph.microsoft.com/"

//android
// msauth://com.anonymous.googleAuth/%2B9XO3lXCJsG%2BP2tcA9odlnnAyMk%3D
// {
//   "client_id" : "927f132e-b18b-47c4-9d84-8225138c02c4",
//   "authorization_user_agent" : "DEFAULT",
//   "redirect_uri" : "msauth://com.anonymous.googleAuth/%2B9XO3lXCJsG%2BP2tcA9odlnnAyMk%3D",
//   "authorities" : [
//     {
//       "type": "AAD",
//       "audience": {
//         "type": "AzureADandPersonalMicrosoftAccount",
//         "tenant_id": "common"
//       }
//     }
//   ]
// }




import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from 'expo-auth-session';
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const MS_CLIENT_ID = "927f132e-b18b-47c4-9d84-8225138c02c4";
const MS_REDIRECT_URI = "msauth.com.anonymous.googleAuth://auth";

const msDiscovery = {
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};


export default function TabScreen() {
  const [googleUserInfo , setGoogleUserInfo ] = useState(null);
  const [microsoftUserInfo , setMicrosoftUserInfo ] = useState(null);
  const [googleRequest,googleResponse,googlePromptAsync] = Google.useAuthRequest({
    androidClientId:"567214050375-mq65glmgop4m7kblmh8o4r6gn2gecapn.apps.googleusercontent.com",
    iosClientId: "567214050375-4jstuf30dbvr9lfuicf0mk6g3v5smqaa.apps.googleusercontent.com",
    webClientId: '567214050375-6nmenaun0puabssou05m0er5tc7dof77.apps.googleusercontent.com',
  });

  const [microsoftRequest,microsoftResponse,microsoftPromptAsync] = AuthSession.useAuthRequest({
    clientId: MS_CLIENT_ID,
    redirectUri: MS_REDIRECT_URI,
    scopes: ['openid', 'profile', 'User.Read',"Files.Read"],
  }, msDiscovery);

  useEffect(()=>{
    handleSignInWithGoogle();
  },[googleResponse])

  useEffect(()=>{
    handleSignInWithMicrosoft();
  },[microsoftResponse])


  async function handleSignInWithGoogle(){
    const user = await AsyncStorage.getItem("@googleUser");
    if(!user){
      if(googleResponse?.type === "success"){
        await getGoogleUserInfo(googleResponse.authentication?.accessToken)
      }
    }else{
      setGoogleUserInfo(JSON.parse(user));
    }
  }

  const getGoogleUserInfo = async(token:any)=>{
    if(!token) return;
    try{
      const response = await fetch("https://www.googleapis.com/userinfo/v2/me",{
        headers: {Authorization:`Bearer ${token}`}
      });
    
      const user = await response.json();
      await AsyncStorage.setItem("@googleUser",JSON.stringify(user));
      setGoogleUserInfo(user);
    }catch(error){
      console.log("Error fetching Google user info:",error);
    }
  }

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

  const clearGoogleStorage = ()=>{
    AsyncStorage.removeItem("@googleUser");
    setGoogleUserInfo(null);
  }
  
  const clearMicrosoftStorage = ()=>{ 
    AsyncStorage.removeItem("@microsoftUser");
    setMicrosoftUserInfo(null);
  }


  return(
    <View style={styles.container}>
      <View>
        <Text>Google</Text>
        {googleUserInfo ? (
          <>
            <Text>{JSON.stringify(googleUserInfo,null,2)}</Text>
            <Button 
              color="red"
              title="delete local storage" onPress={clearGoogleStorage} />
          </>
        ):(
          <Button title="Sign in with GoogleDrive" onPress={()=>{googlePromptAsync()}} />
        )}
      </View>      
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