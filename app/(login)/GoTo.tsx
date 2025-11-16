import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function GoTo() {
  const router = useRouter();
  return (
    <View>
      <Pressable
        onPress={()=>router.push("/music")}
      >
        <Text className="text-white">GoTo(music)</Text>
      </Pressable>
    </View>
  )
}