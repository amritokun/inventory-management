import pdfplumber
import os

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print(f"Opening {file_path}...")
try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"--- Page {i+1} ---")
            text = page.extract_text()
            if text:
                print(text)
            else:
                print("[No text found on this page]")
            
            # Check for tables
            tables = page.extract_tables()
            if tables:
                print(f"Found {len(tables)} tables")
                for table in tables:
                    for row in table:
                        print(row)
except Exception as e:
    print(f"Error: {e}")
