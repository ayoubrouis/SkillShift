import sys
import json
import base64
from io import BytesIO

try:
    import fitz
except ImportError:
    print(json.dumps({"success": False, "error": "PyMuPDF (fitz) not installed. Run: pip install pymupdf"}))
    sys.exit(1)


def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    pages = len(doc)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return {"success": True, "text": text, "pages": pages}


def extract_images(pdf_path):
    doc = fitz.open(pdf_path)
    pages = len(doc)
    images = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        images.append({"data": b64, "page": page.number + 1})
    doc.close()
    return {"success": True, "images": images, "pages": pages}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: pdf_extractor.py <pdf_path> [images]"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "text"

    try:
        if mode == "images":
            result = extract_images(pdf_path)
        else:
            result = extract_text(pdf_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
