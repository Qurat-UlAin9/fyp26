pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    environment {
        PYTHON_PATH = "C:\\Users\\QuratUlAin\\AppData\\Local\\Programs\\Python\\Python311\\python.exe"
    }

    stages {

        stage('Check Versions') {
            steps {
                bat 'node -v'
                bat 'npm -v'
                bat '"%PYTHON_PATH%" --version'
            }
        }

        stage('Create Backend .env') {
            steps {
                dir('backend') {
                    writeFile file: '.env', text: '''
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=aimdb
'''
                }
            }
        }

        stage('Backend Dependencies') {
            steps {
                dir('backend') {
                    bat '"%PYTHON_PATH%" -m venv venv'
                    bat 'venv\\Scripts\\pip install -r requirements.txt'
                }
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    bat 'venv\\Scripts\\python -m pytest -v'
                }
            }
        }

        stage('Frontend Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Frontend Build Check') {
            steps {
                bat 'npx expo export'
            }
        }
    }

    post {
        success {
            echo 'ADHD App CI Pipeline Successful!'
        }

        failure {
            echo 'Pipeline Failed!'
        }
    }
}