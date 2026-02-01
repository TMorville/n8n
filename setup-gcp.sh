#!/bin/bash
set -e

# GCP Setup Script for Slack-to-Notion Summarizer

PROJECT_ID="slack-notion-$(date +%s | tail -c 6)"
ZONE="us-central1-a"
INSTANCE_NAME="n8n-server"

echo "Creating GCP project: $PROJECT_ID"
gcloud projects create $PROJECT_ID --name="Slack to Notion"

echo "Setting active project..."
gcloud config set project $PROJECT_ID

echo "Enabling Compute Engine API..."
gcloud services enable compute.googleapis.com

echo "Creating e2-micro instance (free tier)..."
gcloud compute instances create $INSTANCE_NAME \
  --zone=$ZONE \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=n8n-server \
  --metadata=startup-script='#!/bin/bash
apt update
apt install -y docker.io docker-compose-plugin
usermod -aG docker $(whoami)'

echo ""
echo "✅ GCP setup complete!"
echo "Project ID: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo ""
echo "SSH into instance:"
echo "gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID"
