import sys
import json
import pytesseract
from PIL import Image
import re
from pdf2image import convert_from_path
import os
import cv2
import numpy as np
import magic  # for better file type detection

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Adjust if necessary

def extract_aadhar_details(text):
    aadhar_pattern = r'\d{4}\s?\d{4}\s?\d{4}'
    aadhar_number = re.search(aadhar_pattern, text)

    dob_pattern = r'\d{2}/\d{2}/\d{4}'
    dob = re.search(dob_pattern, text)

    gender = None
    name = None
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    
    # Guess name from line above DOB
    for i, line in enumerate(lines):
        if dob and dob.group() in line and i > 0:
            name = lines[i - 1]
        if not gender and 'male' in line.lower():
            gender = 'Male'
        elif not gender and 'female' in line.lower():
            gender = 'Female'
        elif not gender and ('पुरुष' in line or 'महिला' in line):
            gender = 'पुरुष' if 'पुरुष' in line else 'महिला'

    pin_pattern = r'\b\d{6}\b'
    pin = re.search(pin_pattern, text)

    return {
        "success": True,
        "aadhar_number": aadhar_number.group() if aadhar_number else None,
        "name": name,
        "dob": dob.group() if dob else None,
        "gender": gender,
        "pin_code": pin.group() if pin else None,
        "raw_text": text
    }

def enhance_image(image):
    """Enhance image quality for better OCR"""
    try:
        # Convert PIL Image to OpenCV format
        open_cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Check if image is not empty
        if open_cv_image is None or open_cv_image.size == 0:
            raise ValueError("Empty or invalid image")
        
        # Convert to grayscale
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get black and white image
        _, threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert back to PIL Image
        return Image.fromarray(threshold)
        
    except Exception as e:
        raise Exception(f"Image enhancement failed: {str(e)}")

def process_image(image):
    """Process a single image (PIL Image object) and extract details"""
    try:
        # Validate image
        if image is None or image.size == (0, 0):
            raise ValueError("Invalid or empty image")
            
        # Enhance image quality
        enhanced_image = enhance_image(image)
        
        # Extract text using Tesseract (supports both English and Hindi)
        text = pytesseract.image_to_string(enhanced_image, lang='eng+hin')
        
        # Extract relevant details
        return extract_aadhar_details(text)
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def get_file_type(file_path):
    """Determine file type using multiple methods"""
    try:
        # Try python-magic first
        mime = magic.Magic(mime=True)
        file_type = mime.from_file(file_path)
        
        if 'pdf' in file_type.lower():
            return 'pdf'
        elif 'image' in file_type.lower():
            return 'image'
        
        # Try PIL as fallback
        try:
            with Image.open(file_path) as img:
                img.verify()
            return 'image'
        except:
            pass
        
        # Try OpenCV as last resort
        try:
            img = cv2.imread(file_path)
            if img is not None and img.size > 0:
                return 'image'
        except:
            pass
            
        return None
    except Exception as e:
        return None

def process_file(file_path):
    try:
        # Validate file existence
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Get file type
        file_type = get_file_type(file_path)
        
        if not file_type:
            # Try to detect file type from extension as last resort
            ext = os.path.splitext(file_path)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif']:
                file_type = 'image'
            elif ext == '.pdf':
                file_type = 'pdf'
        
        if not file_type:
            raise ValueError(f"Unable to determine file type for: {file_path}")
        
        if file_type == 'pdf':
            # Convert PDF to images
            images = convert_from_path(file_path)
            
            if not images:
                raise ValueError("No pages found in PDF")
            
            # Process each page
            results = []
            for i, image in enumerate(images):
                result = process_image(image)
                result['page'] = i + 1
                results.append(result)
            
            # If only one page, return just that result, otherwise return array
            final_result = results[0] if len(results) == 1 else results
            
        elif file_type == 'image':
            # Try different image opening methods
            try:
                image = Image.open(file_path)
            except Exception as pil_error:
                # If PIL fails, try using OpenCV
                try:
                    cv_img = cv2.imread(file_path)
                    if cv_img is None:
                        raise ValueError(f"Failed to load image: {pil_error}")
                    image = Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB))
                except Exception as cv_error:
                    raise ValueError(f"Failed to load image with both PIL ({str(pil_error)}) and OpenCV ({str(cv_error)})")
                
            final_result = process_image(image)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        # Print results as JSON (will be captured by Node.js)
        print(json.dumps(final_result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "File path not provided"
        }))
        sys.exit(1)
        
    process_file(sys.argv[1])
