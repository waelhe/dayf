#!/bin/bash
# Saleor API Server

cd /home/z/saleor

# Unset system DATABASE_URL to use Saleor's .env
unset DATABASE_URL

# Set environment
export DJANGO_SETTINGS_MODULE=saleor.settings
export DATABASE_URL="postgres://saleor:saleor123@localhost:5432/saleor"
export REDIS_URL="redis://localhost:6379/1"
export SECRET_KEY="dayf_saleor_secret_key_2025"
export DEBUG="True"
export ALLOWED_HOSTS="localhost,127.0.0.1,0.0.0.0"

# Run Saleor API on port 3002
UV_CACHE_DIR=/tmp/uv_cache uv run python manage.py runserver 0.0.0.0:3002
