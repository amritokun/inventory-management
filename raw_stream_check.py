from pypdf import PdfReader
import os

file_path = r'C:\Users\bhaba\Downloads\KSTAR101.pdf'

try:
    reader = PdfReader(file_path)
    page = reader.pages[0]
    contents = page.get_contents()
    
    if contents:
        # pypdf can have multiple content streams
        if not isinstance(contents, list):
            contents = [contents]
            
        for stream in contents:
            data = stream.get_data()
            print(f"Stream data length: {len(data)}")
            # Sample first 500 bytes of the stream
            print(f"Sample: {data[:500]}")
            
            # Check for text showing operators like (Text) Tj or [ (T) (e) (x) (t) ] TJ
            if b'Tj' in data or b'TJ' in data:
                print("Found text operators in stream!")
            else:
                print("No text operators (Tj/TJ) found in this stream.")

except Exception as e:
    print(f"Error: {e}")
