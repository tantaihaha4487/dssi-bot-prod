pipeline {
    agent any

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        HOST_BOT_PATH  = '/mnt/home/AppData/Apps/dssi-bot'
        BOT_WORK_DIR   = '/workspace/dssi-bot'
        COMPOSE_FILE   = '/workspace/dssi-bot/docker-compose.yml'
        OVERRIDE_FILE  = '/workspace/dssi-bot/docker-compose.override.yml'
        PROJECT_NAME   = 'dssi-bot'
    }

    stages {

        stage('Checkout') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    checkout scm
                }
            }
        }

        stage('Pre-flight Check') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Checking required manual files ==="
                        for f in .env docker-compose.override.yml; do
                            if [ ! -f "$f" ]; then
                                echo "ERROR: Missing required file: $f"
                                exit 1
                            fi
                        done
                        echo "All required files present."
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Pulling latest base images ==="
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            pull --ignore-pull-failures qdrant ollama

                        echo "=== Building bot image ==="
                        docker build --no-cache -t dssi-bot-bot:latest .

                        echo "=== Starting stack ==="
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            up -d --remove-orphans
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "=== Waiting 20s for containers to settle ==="
                    sleep 20
                    echo "=== Container status ==="
                    docker compose -p "${PROJECT_NAME}" ps
                    echo "=== Checking bot container is running ==="
                    STATUS=$(docker inspect --format="{{.State.Status}}" dssi-bot-bot-1 2>/dev/null || echo "missing")
                    if [ "$STATUS" != "running" ]; then
                        echo "ERROR: bot container is not running (status: $STATUS)"
                        docker compose -p "${PROJECT_NAME}" logs --tail=50 bot
                        exit 1
                    fi
                    echo "Bot is running."
                '''
            }
        }
    }

    post {
        success {
            echo "✅ dssi-bot deployed successfully."
        }
        failure {
            echo "❌ Deploy failed. Printing recent logs..."
            sh '''
                docker compose \
                    -p "${PROJECT_NAME}" \
                    -f "${COMPOSE_FILE}" \
                    -f "${OVERRIDE_FILE}" \
                    logs --tail=100 || true
            '''
        }
    }
}
