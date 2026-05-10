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

                        echo "=== Tearing down existing stack (removes stale networks) ==="
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            down --remove-orphans || true

                        echo "=== Starting stack ==="
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            up -d
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Waiting for bot container to become running (up to 10 min) ==="
                        MAX_WAIT=600
                        INTERVAL=10
                        ELAPSED=0

                        while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
                            # Resolve the actual container ID for this compose project+service
                            CONTAINER_ID=$(docker compose \
                                -p "${PROJECT_NAME}" \
                                -f "${COMPOSE_FILE}" \
                                -f "${OVERRIDE_FILE}" \
                                ps -q bot 2>/dev/null | head -1)

                            if [ -n "$CONTAINER_ID" ]; then
                                # docker inspect --format is stable across all Docker versions
                                STATUS=$(docker inspect \
                                    --format "{{.State.Status}}" \
                                    "$CONTAINER_ID" 2>/dev/null || true)
                            else
                                STATUS="<not created>"
                            fi

                            echo "  [${ELAPSED}s] bot status: ${STATUS:-<unknown>}"

                            if [ "$STATUS" = "running" ]; then
                                echo "Bot is running."
                                exit 0
                            fi

                            # Bail early if container has exited/died — it won't recover on its own
                            if [ "$STATUS" = "exited" ] || [ "$STATUS" = "dead" ]; then
                                echo "ERROR: bot container stopped unexpectedly (status: $STATUS)"
                                docker logs --tail=50 "$CONTAINER_ID" || true
                                exit 1
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
