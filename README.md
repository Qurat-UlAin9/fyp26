ADHD Project - Final Year Project

Overview
This project is designed to help in the diagnosis and management of ADHD using modern technology. It features a mobile application for users and a powerful backend for machine learning analysis.

Tech Stack
- Frontend:React Native (Mobile App)
- Backend: Python (Machine Learning & API)
- Database:MySQL
- CI/CD: GitHub Actions

Automation (GitHub Actions)
We have integrated  GitHub Actions to automate our development workflow. 
The CI pipeline automatically:
1. Checks out the code.
2. Sets up the Node.js environment.
3. Installs frontend dependencies.
4. Runs automated tests.

How to Run Locally
1. Clone the repository:
   ```bash
   git clone https://github.com
   ```
2. Install Frontend dependencies:
   ```bash
   npm install
   ```
3. Run the App:
   ```bash
   npx react-native run-android
   ```

Folder Structure
- `/src`: Frontend source code
- `/backend`: Python scripts and ML models
- `.github/workflows`: CI/CD configuration files
