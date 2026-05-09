pipeline {
    agent any

    // ─── Poll GitHub every 5 minutes ─────────────────────────────────────────
    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        // Host-absolute path (= /workspace/dssi-bot inside this container)
        HOST_BOT_PATH  = '/mnt/home/AppData/Apps/dssi-bot'
        BOT_WORK_DIR   = '/workspace/dssi-bot'
        COMPOSE_FILE   = '/workspace/dssi-bot/docker-compose.yml'
        OVERRIDE_FILE  = '/workspace/dssi-bot/docker-compose.override.yml'
        PROJECT_NAME   = 'dssi-bot'
    }

    stages {

        // ── 1. Pull latest code ───────────────────────────────────────────────
        stage('Checkout') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    checkout scm   // reuses the Git config already set in this Jenkins job
                }
            }
        }

        // ── 2. Verify required manual files exist ────────────────────────────
        stage('Pre-flight Check') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Checking required manual files ==="
                        for f in .env config.yaml docker-compose.override.yml; do
                            if [ ! -f "$f" ]; then
                                echo "ERROR: Missing required file: $f"
                                echo "Place it at ${HOST_BOT_PATH}/$f on the TrueNAS host."
                                exit 1
                            fi
                        done
                        echo "All required files present."
                    '''
                }
            }
        }

        // ── 3. Build + deploy ─────────────────────────────────────────────────
        stage('Deploy') {
            steps {
                dir("${BOT_WORK_DIR}") {
                    sh '''
                        echo "=== Pulling latest images ==="
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            pull --ignore-pull-failures

                        echo "=== Building bot image ==="
                        docker compose \
                            -p "${PROJECT_NAME}" \
                            -f "${COMPOSE_FILE}" \
                            -f "${OVERRIDE_FILE}" \
                            build --no-cache bot

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

        // ── 4. Smoke test ─────────────────────────────────────────────────────
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
