import pdfplumber
import os
from PIL import Image

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print(f"Opening {file_path} for image extraction...")
try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"--- Page {i+1} ---")
            images = page.images
            print(f"Found {len(images)} images on page {i+1}")
            for j, img in enumerate(images):
                print(f"Image {j+1}: {img['width']}x{img['height']} at ({img['x0']}, {img['top']})")
except Exception as e:
    print(f"Error: {e}")
