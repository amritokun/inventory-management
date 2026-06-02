import pdfplumber
import os

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

try:
    with pdfplumber.open(file_path) as pdf:
        page = pdf.pages[0]
        # pdfplumber doesn't easily extract raw images, but we can crop and save
        # Or use another library. Let's try rendering at high res and OCR'ing with a more focused approach.
        
        # Save as image
        im = page.to_image(resolution=600)
        im.save("high_res_barcode.png")
        print("Saved high_res_barcode.png")

except Exception as e:
    print(f"Error: {e}")
