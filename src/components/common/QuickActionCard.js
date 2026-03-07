import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import colors from "../../theme/colors";

const QuickActionCard = ({ title, icon, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Icon name={icon} size={24} color={colors.primary} />
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

export default QuickActionCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginHorizontal: 5,
  },
  text: {
    color: colors.textPrimary,
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
});