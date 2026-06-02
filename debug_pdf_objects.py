from pypdf import PdfReader
import os

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print(f"Analyzing {file_path} with pypdf...")
try:
    reader = PdfReader(file_path)
    for i, page in enumerate(reader.pages):
        print(f"--- Page {i+1} ---")
        
        # Try raw text extraction
        text = page.extract_text()
        print(f"Extracted Text: '{text}'")
        
        # Inspect fonts
        if "/Resources" in page and "/Font" in page["/Resources"]:
            fonts = page["/Resources"]["/Font"]
            print(f"Fonts found: {fonts.keys()}")
            for f_key in fonts:
                f_obj = fonts[f_key]
                print(f"  - {f_key}: {f_obj.get('/BaseFont', 'Unknown')}")

        # Deep search for content streams
        content = page.get_contents()
        if content:
             print(f"Page has {len(content) if isinstance(content, list) else 1} content streams.")

except Exception as e:
    print(f"Error: {e}")
