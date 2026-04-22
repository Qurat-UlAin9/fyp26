import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import colors from "../../theme/colors";

const MainFeatureCard = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.container}
      >
        <View style={styles.content}>
          <Icon name="chatbubbles-outline" size={28} color="#fff" />
          <Text style={styles.title}>Talk to AI Assistant</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default MainFeatureCard;

const styles = StyleSheet.create({
  container: {
    height: 90,
    borderRadius: 18,
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
  },
});