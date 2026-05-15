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
        REPO_URL       = 'https://github.com/tantaihaha4487/dssi-bot-prod'
    }

    stages {

        stage('Checkout') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Marking workspace as safe for git ==="
                        git config --global --add safe.directory "${BOT_WORK_DIR}"

                        echo "=== Initialising git repo if needed ==="
                        if [ ! -d .git ]; then
                            git init
                        fi

                        # Add remote if missing, otherwise update URL (handles partial-init state)
                        if git remote get-url origin > /dev/null 2>&1; then
                            git remote set-url origin "${REPO_URL}"
                        else
                            git remote add origin "${REPO_URL}"
                        fi

                        echo "=== Fetching latest from origin/main ==="
                        git fetch --tags --force origin main

                        echo "=== Resetting to origin/main (keeps untracked files) ==="
                        git reset --hard origin/main

                        echo "=== Cleaning untracked/ignored files, preserving /data and manual config ==="
                        # -f  force
                        # -d  remove untracked directories
                        # -x  also remove git-ignored files (node_modules, caches, etc.)
                        # --exclude keeps the listed paths even with -x
                        git clean -fdx \
                            --exclude=data/ \
                            --exclude=.cache/ \
                            --exclude=.env \
                            --exclude=docker-compose.override.yml

                        echo "=== Checkout complete. Current HEAD ==="
                        git log -1 --oneline
                    '''
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
                            CONTAINER_ID=$(docker compose \
                                -p "${PROJECT_NAME}" \
                                -f "${COMPOSE_FILE}" \
                                -f "${OVERRIDE_FILE}" \
                                ps -q bot 2>/dev/null | head -1)

                            if [ -n "$CONTAINER_ID" ]; then
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
