#!/bin/bash

# Update and install necessary packages
apt-get update
apt-get install -y tesseract-ocr

# Install additional language packs if necessary (e.g., for Hindi)
apt-get install -y tesseract-ocr-hin

# Verify installation
tesseract --version
