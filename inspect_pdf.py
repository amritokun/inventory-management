import os

def check_pdf(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'rb') as f:
        header = f.read(1024)
        print(f"Header: {header[:50]}")
        # Look for typical PDF markers
        if b'/Type /Page' in header or b'/Pages' in header or b'obj' in header:
            print("Found PDF objects in first 1024 bytes.")
        else:
            print("PDF objects not found in first 1024 bytes.")

check_pdf(r'C:\Users\bhaba\Downloads\KSTAR101.pdf')
