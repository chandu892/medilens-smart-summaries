"""
PDF text extraction.
Uses pdfplumber (best for text PDFs) with a PyMuPDF fallback.
Returns an empty string if both fail so the pipeline degrades gracefully.
"""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """
    Try pdfplumber first; fall back to PyMuPDF (fitz).
    Returns empty string on failure.
    """
    text = _try_pdfplumber(file_path)
    if text.strip():
        return text
    text = _try_pymupdf(file_path)
    return text


def _try_pdfplumber(file_path: str) -> str:
    try:
        import pdfplumber  # type: ignore

        with pdfplumber.open(file_path) as pdf:
            pages = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
            return "\n\n".join(pages)
    except ImportError:
        logger.warning("pdfplumber not installed — skipping.")
        return ""
    except Exception as exc:
        logger.warning("pdfplumber extraction failed: %s", exc)
        return ""


def _try_pymupdf(file_path: str) -> str:
    try:
        import fitz  # PyMuPDF  # type: ignore

        doc = fitz.open(file_path)
        pages = [page.get_text() for page in doc]
        doc.close()
        return "\n\n".join(pages)
    except ImportError:
        logger.warning("PyMuPDF (fitz) not installed — skipping.")
        return ""
    except Exception as exc:
        logger.warning("PyMuPDF extraction failed: %s", exc)
        return ""
