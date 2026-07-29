import os
from pydantic import BaseModel
from pypdf import PdfReader

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text content from a PDF file path.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at: {file_path}")
    
    reader = PdfReader(file_path)
    text_content = []
    
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            text_content.append(f"--- Page {i + 1} ---\n" + page_text.strip())
            
    full_text = "\n\n".join(text_content)
    if not full_text.strip():
        raise ValueError("Could not extract any text from the provided PDF file.")
        
    return full_text
