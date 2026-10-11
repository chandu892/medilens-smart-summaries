"""
OCR service — pytesseract + Pillow + OpenCV preprocessing for images
and scanned PDFs.

If Tesseract is not installed on the system the function returns a clear
error message instead of crashing the whole pipeline.

Install Tesseract:
  Windows : https://github.com/UB-Mannheim/tesseract/wiki
            Add C:\\Program Files\\Tesseract-OCR to PATH (or set
            pytesseract.pytesseract.tesseract_cmd in .env)
  Ubuntu  : sudo apt install tesseract-ocr
  macOS   : brew install tesseract
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

TESSERACT_CMD = os.getenv("TESSERACT_CMD", "")


def _configure_tesseract() -> None:
    if TESSERACT_CMD:
        try:
            import pytesseract  # type: ignore
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        except ImportError:
            pass


_configure_tesseract()


def ocr_image(file_path: str) -> str:
    """
    Run OCR on a single image file.
    Returns extracted text or an error message string.
    """
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
    except ImportError:
        return (
            "[OCR unavailable: pytesseract or Pillow not installed. "
            "Run: pip install pytesseract Pillow]"
        )

    try:
        image = Image.open(file_path)
        image = _preprocess(image)
        text = pytesseract.image_to_string(image, lang="eng")
        return text.strip()
    except pytesseract.pytesseract.TesseractNotFoundError:
        return (
            "[OCR unavailable: Tesseract is not installed or not on PATH. "
            "Install it from https://github.com/UB-Mannheim/tesseract/wiki "
            "and set TESSERACT_CMD in backend/.env if needed.]"
        )
    except Exception as exc:
        logger.warning("OCR failed for %s: %s", file_path, exc)
        return f"[OCR failed: {exc}]"


def ocr_scanned_pdf(file_path: str) -> str:
    """
    Convert each page of a scanned PDF to an image then run OCR.
    Requires pdf2image + poppler.
    Falls back to the normal PDF extraction if pdf2image is missing.
    """
    try:
        from pdf2image import convert_from_path  # type: ignore
    except ImportError:
        logger.warning("pdf2image not installed — cannot OCR scanned PDF.")
        return ""

    try:
        pages = convert_from_path(file_path, dpi=200)
        results = []
        for i, page_img in enumerate(pages):
            logger.info("OCR page %d/%d of %s", i + 1, len(pages), file_path)
            import io, tempfile
            from PIL import Image
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                page_img.save(tmp.name, "PNG")
                text = ocr_image(tmp.name)
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass
            results.append(text)
        return "\n\n".join(results)
    except Exception as exc:
        logger.warning("Scanned-PDF OCR failed: %s", exc)
        return ""


def _preprocess(image):
    """
    Optional OpenCV preprocessing: grayscale + Otsu threshold.
    Falls back to original image if OpenCV is not installed.
    """
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
        from PIL import Image

        img_array = np.array(image)
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return Image.fromarray(thresh)
    except ImportError:
        return image  # OpenCV optional — still works without it
    except Exception:
        return image
