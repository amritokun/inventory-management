import pdfplumber
import os
from PIL import Image
from pyzbar.pyzbar import decode
import io

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print(f"Analyzing {file_path} for barcodes...")
try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"--- Page {i+1} ---")
            
            # 1. Try to extract barcodes from images
            for j, img_dict in enumerate(page.images):
                try:
                    # Extract image data
                    # x0, top, x1, bottom = img_dict['x0'], img_dict['top'], img_dict['x1'], img_dict['bottom']
                    # We need to use page.to_image() or extract the image object directly
                    # For simplicity with pdfplumber, we can use to_image() and then crop if needed
                    # but let's try to get the image object
                    
                    # pdfplumber doesn't expose raw image bytes easily in a standard way across all backends
                    # So let's use the page render approach
                    pass
                except Exception as e:
                    print(f"  Error processing image {j+1}: {e}")

            # 2. Render page to image and scan for barcodes
            img = page.to_image(resolution=300)
            pil_img = img.original
            
            barcodes = decode(pil_img)
            if barcodes:
                print(f"  Found {len(barcodes)} barcodes on page {i+1}:")
                for barcode in barcodes:
                    data = barcode.data.decode('utf-8')
                    type = barcode.type
                    print(f"    - [{type}] {data}")
            else:
                print(f"  No barcodes found on page {i+1} via rendering.")
                
except Exception as e:
    print(f"Error: {e}")
