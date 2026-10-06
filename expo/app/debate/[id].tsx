import { useLocalSearchParams, Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import DecisionDetailScreen from "../decision/[id]";

/**
 * Public share URL route: https://thedecidr.app/debate/<id>
 * Renders the exact same decision detail screen as the in-app route, so
 * shared links preserve authentication, voting, and vote-before-AI-reveal.
 * Opening a shared link never creates a duplicate debate.
 */
export default function DebateShareRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <DecisionDetailScreen key={id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});
