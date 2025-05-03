#!/bin/bash
# setup-secrets.sh - Script to set up Docker secrets directory structure

# Create secrets directory if it doesn't exist
mkdir -p secrets

# Create example secret files
if [ ! -f ./secrets/abs_api_key.txt ]; then
  echo "Enter your Audiobookshelf API key:"
  read -s abs_api_key
  echo "$abs_api_key" > ./secrets/abs_api_key.txt
  echo "Audiobookshelf API key saved to secrets/abs_api_key.txt"
else
  echo "secrets/abs_api_key.txt already exists, skipping"
fi

if [ ! -f ./secrets/hardcover_api_key.txt ]; then
  echo "Enter your Hardcover API key:"
  read -s hardcover_api_key
  echo "$hardcover_api_key" > ./secrets/hardcover_api_key.txt
  echo "Hardcover API key saved to secrets/hardcover_api_key.txt"
else
  echo "secrets/hardcover_api_key.txt already exists, skipping"
fi

# Set correct permissions
chmod 600 ./secrets/*.txt

echo "Secret files setup complete!"
echo "You can now run 'docker-compose up -d' to start the application with secrets."