# import os
# import re
# import numpy as np
# import pytesseract
# import cv2
# import pdf2image
# from PIL import Image
# import logging

# # Set up logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# # Custom exception for Aadhaar verification failures
# class AadharVerificationError(Exception):
#     pass

# # Convert PDF to images
# def convert_pdf_to_images(pdf_path, dpi=300):
#     try:
#         logging.info(f"Converting PDF {pdf_path} to images...")
#         return pdf2image.convert_from_path(pdf_path, dpi=dpi)
#     except Exception as e:
#         logging.error(f"PDF conversion failed: {str(e)}")
#         raise AadharVerificationError(f"PDF conversion failed: {str(e)}")

# # Preprocess the image for OCR
# def preprocess_image(image):
#     img_array = np.array(image)
#     gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
#     thresh = cv2.adaptiveThreshold(
#         gray, 255, 
#         cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
#         cv2.THRESH_BINARY, 11, 2
#     )
#     denoised = cv2.fastNlMeansDenoising(thresh)
    
#     # Save the processed image for debugging
#     processed_image_path = "processed_image.png"
#     cv2.imwrite(processed_image_path, denoised)
#     logging.info(f"Processed image saved at {processed_image_path}")
    
#     return denoised

# # Extract Aadhaar details using OCR
# def extract_aadhar_details(image):
#     custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'
#     text = pytesseract.image_to_string(image, config=custom_config)
    
#     # Regex patterns for Aadhaar number and name
#     aadhar_pattern = r'\b\d{4}\s?\d{4}\s?\d{4}\b'
#     name_pattern = r'^[A-Z][a-z]+ [A-Z][a-z]+'

#     # Extract Aadhaar numbers and names
#     aadhar_numbers = [
#         num.replace(' ', '') 
#         for num in re.findall(aadhar_pattern, text) 
#         if len(num.replace(' ', '')) == 12
#     ]
#     names = re.findall(name_pattern, text, re.MULTILINE)

#     return {
#         'aadhar_numbers': aadhar_numbers,
#         'names': names,
#         'raw_text': text
#     }

# # Validate extracted Aadhaar details
# def validate_aadhar_details(details):
#     return bool(details['aadhar_numbers'])

# # Process Aadhaar PDF
# def process_aadhar_pdf(pdf_path):
#     try:
#         # Convert PDF pages to images
#         images = convert_pdf_to_images(pdf_path)

#         if len(images) < 2:
#             raise AadharVerificationError("PDF must contain at least 2 pages")

#         # Process images (front and back)
#         front_image = preprocess_image(images[0])
#         back_image = preprocess_image(images[1])

#         # Extract details from both pages
#         front_details = extract_aadhar_details(front_image)
#         back_details = extract_aadhar_details(back_image)

#         # Validate extracted details
#         if not (validate_aadhar_details(front_details) and 
#                 validate_aadhar_details(back_details)):
#             raise AadharVerificationError("Invalid Aadhaar details")

#         return {
#             'status': 'VERIFIED',
#             'front_details': front_details,
#             'back_details': back_details
#         }

#     except AadharVerificationError as e:
#         logging.error(f"Aadhaar verification failed: {str(e)}")
#         return {'status': 'FAILED', 'error': str(e)}
#     except Exception as e:
#         logging.error(f"Unexpected error: {str(e)}")
#         return {'status': 'FAILED', 'error': f'Unexpected error: {str(e)}'}

# # Entry point for testing the script
# if __name__ == '__main__':
#     import sys
#     import json
    
#     if len(sys.argv) < 2:
#         logging.error("No PDF path provided")
#         print(json.dumps({'status': 'FAILED', 'error': 'No PDF path provided'}))
#         sys.exit(1)
    
#     pdf_path = sys.argv[1]
#     result = process_aadhar_pdf(pdf_path)
#     print(json.dumps(result))


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
    # Extract Aadhaar number (12 digits with possible spaces)
    aadhar_pattern = r'\d{4}\s?\d{4}\s?\d{4}'
    aadhar_number = re.search(aadhar_pattern, text)
    
    # Extract name (assumes name is after "Name:" or similar indicators)
    name_pattern = r'(?i)(?:name|नाम)[\s:]+([^\n]+)'
    name = re.search(name_pattern, text)
    
    # Extract DOB (in DD/MM/YYYY format)
    dob_pattern = r'\d{2}/\d{2}/\d{4}'
    dob = re.search(dob_pattern, text)
    
    # Extract gender (searches for Male, Female, पुरुष, महिला)
    gender_pattern = r'(?i)(MALE|FEMALE|मर्द|महिला|पुरुष)'
    gender = re.search(gender_pattern, text)

    # Extract address with possible PIN code (6 digits)
    address_pattern = r'(\d{6})'  # Regex for capturing a 6-digit PIN code
    address = re.search(address_pattern, text)

    # Prepare the results
    results = {
        "success": True,
        "aadhar_number": aadhar_number.group() if aadhar_number else None,
        "name": name.group(1).strip() if name else None,
        "dob": dob.group() if dob else None,
        "gender": gender.group() if gender else None,
        "pin_code": address.group(1) if address else None,
        "raw_text": text
    }
    
    return results

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
