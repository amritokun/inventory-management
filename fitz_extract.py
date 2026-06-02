import fitz
import os

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

try:
    doc = fitz.open(file_path)
    for i, page in enumerate(doc):
        print(f"--- Page {i+1} ---")
        text = page.get_text("text")
        print(f"Text: '{text}'")
        
        # Try words
        words = page.get_text("words")
        if words:
            print(f"Words found: {words}")
            
        # Try rawdict
        raw = page.get_text("rawdict")
        for block in raw.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    print(f"Span: '{span['text']}' Font: {span['font']}")

except Exception as e:
    print(f"Error: {e}")
