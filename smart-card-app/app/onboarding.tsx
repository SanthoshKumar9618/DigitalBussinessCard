import { View, Text, StyleSheet, FlatList, Dimensions } from "react-native";
import { Colors, Fonts } from "@/constants/theme";
import PrimaryButton from "@/components/PrimaryButton";
import { router } from "expo-router";

const slides = [
  { title: "Tap to Share", desc: "Instantly share your profile using NFC" },
  { title: "Smart Contacts", desc: "Save people you meet automatically" },
  { title: "Always Updated", desc: "Your details update everywhere" },
];

export default function Onboarding() {
  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        pagingEnabled
        data={slides}
        renderItem={({ item, index }) => (
          <View style={styles.slide}>
            <Text style={Fonts.title}>{item.title}</Text>
            <Text style={Fonts.subtitle}>{item.desc}</Text>

            {index === 2 && (
              <PrimaryButton
                title="Get Started"
                onPress={() => router.replace("/login")}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  slide: {
    width: Dimensions.get("window").width,
    padding: 30 ,
    justifyContent: "center",
  },
});
