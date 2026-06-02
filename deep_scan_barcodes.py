import pdfplumber
import os
from PIL import Image, ImageEnhance
from pyzbar.pyzbar import decode

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

def scan_with_params(pil_img, res, contrast=1.0):
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(contrast)
    
    return decode(pil_img)

try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"--- Page {i+1} ---")
            
            for res in [300, 600]:
                print(f"  Trying resolution {res}...")
                img = page.to_image(resolution=res)
                pil_img = img.original
                
                for contrast in [1.0, 1.5, 2.0]:
                    barcodes = scan_with_params(pil_img, res, contrast)
                    if barcodes:
                        print(f"    Found {len(barcodes)} barcodes (res={res}, contrast={contrast}):")
                        for barcode in barcodes:
                            print(f"      - [{barcode.type}] {barcode.data.decode('utf-8')}")
                        # If found, maybe we can stop for this page
                        break
                if barcodes: break
            else:
                print("  No barcodes found with any parameters.")
                
except Exception as e:
    print(f"Error: {e}")
