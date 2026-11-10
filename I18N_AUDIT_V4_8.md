# XSUS App V4.8 — Language Review

## Changes
- Corrected Albanian status **Draft → Projekt** and **DRAFT → PROJEKT** (context: unpublished project).
- Added `tests/i18n-identical-v4-8.py` to classify identical EN/SQ/FR values against an explicit list of shared brand names, technical terms and common words. New unexplained identical strings will fail this audit.
- Retained the original XSUS App logo and modular layout.

## Scope and limitations
Automated dictionary parity and syntax checks do not prove translation quality or correct browser behavior. Browser/mobile testing and contextual human proofreading remain pending. No GitHub or AI core changes.
