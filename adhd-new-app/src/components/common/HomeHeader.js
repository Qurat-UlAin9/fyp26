import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import colors from "../../theme/colors";

const HomeHeader = ({ userName, onProfilePress, onSettingsPress, onRewardsPress }) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Good Morning,</Text>
        <Text style={styles.name}>{userName}</Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onRewardsPress} style={styles.iconButton}>
          <Icon name="trophy-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onSettingsPress} style={styles.iconButton}>
          <Icon name="settings-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onProfilePress}>
          <Image
            source={{ uri: "https://i.pravatar.cc/100" }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});