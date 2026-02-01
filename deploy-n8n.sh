#!/bin/bash
set -e

# Deploy n8n to GCP VM
VM_NAME="n8n-server"
ZONE="europe-west4-a"
PROJECT="slack-notion-93434"

echo "Generating encryption key..."
ENCRYPTION_KEY=$(openssl rand -hex 16)

echo "Creating .env file..."
cat > /tmp/n8n-env << EOF
N8N_ENCRYPTION_KEY=$ENCRYPTION_KEY
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=$(openssl rand -base64 16)
N8N_HOST=n8n.soraia.io
EOF

echo "Copying files to VM..."
gcloud compute scp docker-compose.yml $VM_NAME:~/ --zone=$ZONE --project=$PROJECT
gcloud compute scp /tmp/n8n-env $VM_NAME:~/.env --zone=$ZONE --project=$PROJECT

echo "Starting n8n..."
gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT --command="
docker compose up -d
"

echo ""
echo "✅ n8n deployed!"
echo "Credentials saved to /tmp/n8n-env"
cat /tmp/n8n-env
