import os
import re
import numpy as np
import pytesseract
import cv2
import pdf2image
from PIL import Image
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Custom exception for Aadhaar verification failures
class AadharVerificationError(Exception):
    pass

# Convert PDF to images
def convert_pdf_to_images(pdf_path, dpi=300):
    try:
        logging.info(f"Converting PDF {pdf_path} to images...")
        return pdf2image.convert_from_path(pdf_path, dpi=dpi)
    except Exception as e:
        logging.error(f"PDF conversion failed: {str(e)}")
        raise AadharVerificationError(f"PDF conversion failed: {str(e)}")

# Preprocess the image for OCR
def preprocess_image(image):
    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    denoised = cv2.fastNlMeansDenoising(thresh)
    
    # Save the processed image for debugging
    processed_image_path = "processed_image.png"
    cv2.imwrite(processed_image_path, denoised)
    logging.info(f"Processed image saved at {processed_image_path}")
    
    return denoised

# Extract Aadhaar details using OCR
def extract_aadhar_details(image):
    custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'
    text = pytesseract.image_to_string(image, config=custom_config)
    
    # Regex patterns for Aadhaar number and name
    aadhar_pattern = r'\b\d{4}\s?\d{4}\s?\d{4}\b'
    name_pattern = r'^[A-Z][a-z]+ [A-Z][a-z]+'

    # Extract Aadhaar numbers and names
    aadhar_numbers = [
        num.replace(' ', '') 
        for num in re.findall(aadhar_pattern, text) 
        if len(num.replace(' ', '')) == 12
    ]
    names = re.findall(name_pattern, text, re.MULTILINE)

    return {
        'aadhar_numbers': aadhar_numbers,
        'names': names,
        'raw_text': text
    }

# Validate extracted Aadhaar details
def validate_aadhar_details(details):
    return bool(details['aadhar_numbers'])

# Process Aadhaar PDF
def process_aadhar_pdf(pdf_path):
    try:
        # Convert PDF pages to images
        images = convert_pdf_to_images(pdf_path)

        if len(images) < 2:
            raise AadharVerificationError("PDF must contain at least 2 pages")

        # Process images (front and back)
        front_image = preprocess_image(images[0])
        back_image = preprocess_image(images[1])

        # Extract details from both pages
        front_details = extract_aadhar_details(front_image)
        back_details = extract_aadhar_details(back_image)

        # Validate extracted details
        if not (validate_aadhar_details(front_details) and 
                validate_aadhar_details(back_details)):
            raise AadharVerificationError("Invalid Aadhaar details")

        return {
            'status': 'VERIFIED',
            'front_details': front_details,
            'back_details': back_details
        }

    except AadharVerificationError as e:
        logging.error(f"Aadhaar verification failed: {str(e)}")
        return {'status': 'FAILED', 'error': str(e)}
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return {'status': 'FAILED', 'error': f'Unexpected error: {str(e)}'}

# Entry point for testing the script
if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        logging.error("No PDF path provided")
        print(json.dumps({'status': 'FAILED', 'error': 'No PDF path provided'}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = process_aadhar_pdf(pdf_path)
    print(json.dumps(result))
