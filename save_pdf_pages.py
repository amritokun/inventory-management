import pdfplumber
import os

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            img = page.to_image(resolution=300)
            img.save(f"page_{i+1}.png")
            print(f"Saved page_{i+1}.png")
except Exception as e:
    print(f"Error: {e}")
