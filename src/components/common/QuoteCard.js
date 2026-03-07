import React from "react";
import { View, Text, StyleSheet, ImageBackground } from "react-native";
import colors from "../../theme/colors";

const QuoteCard = ({ quote }) => {
  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee" }}
      style={styles.container}
      imageStyle={{ borderRadius: 16 }}
    >
      <View style={styles.overlay}>
        <Text style={styles.quoteText}>{quote}</Text>
      </View>
    </ImageBackground>
  );
};

export default QuoteCard;

const styles = StyleSheet.create({
  container: {
    height: 140,
    borderRadius: 16,
    marginVertical: 20,
    overflow: "hidden",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  quoteText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});