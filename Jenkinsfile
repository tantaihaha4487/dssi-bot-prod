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
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Waiting for bot container to become healthy (up to 10 min) ==="
                        MAX_WAIT=600
                        INTERVAL=10
                        ELAPSED=0

                        while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
                            STATUS=$(docker compose \
                                -p "${PROJECT_NAME}" \
                                -f "${COMPOSE_FILE}" \
                                -f "${OVERRIDE_FILE}" \
                                ps --format json bot 2>/dev/null \
                                | grep -o '"State":"[^"]*"' | head -1 | cut -d'"' -f4)

                            echo "  [${ELAPSED}s] bot status: ${STATUS:-<unknown>}"

                            if [ "$STATUS" = "running" ]; then
                                echo "Bot is running."
                                exit 0
                            fi

                            sleep "$INTERVAL"
                            ELAPSED=$((ELAPSED + INTERVAL))
                        done

                        echo "ERROR: bot did not reach 'running' state within ${MAX_WAIT}s"
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            logs --tail=50 bot
                        exit 1
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ dssi-bot deployed successfully."
        }
        failure {
            echo "❌ Deploy failed. Printing recent logs..."
            dir("${BOT_WORK_DIR}") {
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
}
