import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
  
  WebBrowser.maybeCompleteAuthSession();
  
  export default function GoogleSignInScreen() {
    const [googleUserInfo , setGoogleUserInfo ] = useState(null);
    const [googleRequest,googleResponse,googlePromptAsync] = Google.useAuthRequest({
      androidClientId:"567214050375-70p13dhdknjbebv9uv8cjd7qhjd4bkie.apps.googleusercontent.com",
      iosClientId: "567214050375-4jstuf30dbvr9lfuicf0mk6g3v5smqaa.apps.googleusercontent.com",
      webClientId: '567214050375-6nmenaun0puabssou05m0er5tc7dof77.apps.googleusercontent.com',
    });
  
  
    useEffect(()=>{
      handleSignInWithGoogle();
    },[googleResponse])
  
  
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
  
    const clearGoogleStorage = ()=>{
      AsyncStorage.removeItem("@googleUser");
      setGoogleUserInfo(null);
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