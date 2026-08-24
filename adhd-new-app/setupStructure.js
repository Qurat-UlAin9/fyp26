const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "src");

const structure = [
  "assets/animations",
  "assets/icons",
  "assets/images",

  "components/chatbot",
  "components/common",
  "components/emotion",
  "components/focus",
  "components/habits",

  "data",
  "navigation",

  "screens/Auth",
  "screens/Chatbot",
  "screens/Detection",
  "screens/EmotionRegulation",
  "screens/Focus",
  "screens/Habits",
  "screens/Home",
  "screens/Rewards",
  "screens/Tasks",
  "screens/Visualization",

  "theme",
  "utils"
];

const files = [
  "assets/animations/breathing.json",
  "assets/icons/happy.png",
  "assets/images/onboarding1.png",

  "components/chatbot/MessageBubble.js",

  "components/common/ADHDBUtton.js",
  "components/common/ADHDCard.js",
  "components/common/ButtonPrimary.js",
  "components/common/ThemeProvider.js",

  "components/emotion/MoodEmoji.js",
  "components/focus/SoundCard.js",
  "components/habits/StreakBar.js",

  "data/moodData.js",
  "navigation/AppNavigator.js",

  "screens/Auth/LanguageThemeScreen.js",
  "screens/Auth/LoginScreen.js",
  "screens/Auth/OnboardingScreen.js",
  "screens/Auth/RegisterScreen.js",

  "screens/Chatbot/ChatbotScreen.js",
  "screens/Detection/QuestionnaireScreen.js",
  "screens/EmotionRegulation/EmotionRegulationScreen.js",
  "screens/Focus/SessionSummaryScreen.js",
  "screens/Habits/HabitDetailsScreen.js",
  "screens/Home/ProfileScreen.js",
  "screens/Home/SettingsScreen.js",
  "screens/Rewards/BadgesScreen.js",
  "screens/Tasks/CreateTaskScreen.js",
  "screens/Tasks/TaskDetailsScreen.js",

  "SplashScreen.js",
  "theme/colors.js",
  "utils/formatTime.js"
];


// Create directories
structure.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
});

// Create files
files.forEach(file => {
  const fullPath = path.join(baseDir, file);
  fs.writeFileSync(fullPath, "", { flag: "w" });
});

// Create project-structure.txt in root
fs.writeFileSync("project-structure.txt", "Project structure initialized.\n");

console.log("✅ ADHD App folder structure created successfully!");