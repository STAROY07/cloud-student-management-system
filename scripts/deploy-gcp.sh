#!/bin/bash
# ==============================================================================
# Google Cloud Platform (GCP) Automated Deployment Script
# Cloud Student Management System — Semester 5 Cloud Computing
# Target Architecture: Cloud Run + Cloud SQL (PostgreSQL) + Secret Manager
# ==============================================================================

set -e

# Configuration Variables
PROJECT_ID=${GCP_PROJECT_ID:-"$(gcloud config get-value project 2>/dev/null)"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="cloud-student-management-system"
DB_INSTANCE_NAME="cloud-sms-postgres-db"
DB_NAME="cloud_sms"
DB_USER="cloud_sms_user"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "========================================================================"
echo " Starting GCP Cloud Deployment for ${SERVICE_NAME}"
echo " Project: ${PROJECT_ID} | Region: ${REGION}"
echo "========================================================================"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No GCP project configured. Run 'gcloud config set project <PROJECT_ID>' first."
  exit 1
fi

# Step 1: Enable Google Cloud APIs
echo ""
echo "[Step 1/6] Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project="${PROJECT_ID}"

# Step 2: Create Cloud SQL PostgreSQL Instance (if not exists)
echo ""
echo "[Step 2/6] Checking Cloud SQL PostgreSQL instance..."
if ! gcloud sql instances describe "${DB_INSTANCE_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Creating Cloud SQL instance ${DB_INSTANCE_NAME} (db-f1-micro tier for development)..."
  DB_PASSWORD=$(openssl rand -base64 16)
  gcloud sql instances create "${DB_INSTANCE_NAME}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --project="${PROJECT_ID}"

  # Create Database & User
  gcloud sql databases create "${DB_NAME}" --instance="${DB_INSTANCE_NAME}" --project="${PROJECT_ID}"
  gcloud sql users create "${DB_USER}" --instance="${DB_INSTANCE_NAME}" --password="${DB_PASSWORD}" --project="${PROJECT_ID}"
  echo "Cloud SQL instance created successfully."
else
  echo "Cloud SQL instance ${DB_INSTANCE_NAME} already exists."
fi

# Get Cloud SQL Connection Name
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "${DB_INSTANCE_NAME}" --project="${PROJECT_ID}" --format='value(connectionName)')
echo "Database Connection Name: ${INSTANCE_CONNECTION_NAME}"

# Step 3: Manage Secrets in Google Secret Manager
echo ""
echo "[Step 3/6] Configuring Google Secret Manager secrets..."
JWT_SECRET_VALUE=$(openssl rand -base64 32)

create_or_update_secret() {
  SECRET_NAME=$1
  SECRET_VAL=$2

  if ! gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "Creating secret ${SECRET_NAME}..."
    printf "%s" "${SECRET_VAL}" | gcloud secrets create "${SECRET_NAME}" --data-file=- --project="${PROJECT_ID}"
  else
    echo "Secret ${SECRET_NAME} exists. Adding latest version..."
    printf "%s" "${SECRET_VAL}" | gcloud secrets versions add "${SECRET_NAME}" --data-file=- --project="${PROJECT_ID}"
  fi
}

create_or_update_secret "SMS_JWT_SECRET" "${JWT_SECRET_VALUE}"

# Step 4: Build Container Image using Cloud Build
echo ""
echo "[Step 4/6] Building production container image with Cloud Build..."
gcloud builds submit --tag "${IMAGE_TAG}" --project="${PROJECT_ID}"

# Step 5: Deploy Service to Cloud Run
echo ""
echo "[Step 5/6] Deploying stateless service to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_TAG}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --allow-unauthenticated \
  --add-cloudsql-instances="${INSTANCE_CONNECTION_NAME}" \
  --set-env-vars="NODE_ENV=production,PORT=8080,DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_SOCKET_PATH=/cloudsql/${INSTANCE_CONNECTION_NAME}" \
  --set-secrets="JWT_SECRET=SMS_JWT_SECRET:latest" \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1

# Step 6: Verify Deployment & Output Public URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform=managed --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

echo ""
echo "========================================================================"
echo " Deployment Successfully Completed!"
echo " Public Application HTTPS URL: ${SERVICE_URL}"
echo " Health Probe: ${SERVICE_URL}/api/health"
echo " Cloud Logging: https://console.cloud.google.com/logs/query?project=${PROJECT_ID}"
echo " Cloud Monitoring: https://console.cloud.google.com/monitoring?project=${PROJECT_ID}"
echo "========================================================================"
