"""XSUS App V4.9 browser checks. Run: python tests/xsus-app/browser-language-v4-9.py
Requires Playwright and Chromium; prints PASS only after actual browser assertions.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import os, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        executable = os.environ.get('XSUS_CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True}
        if executable:
            options.update(executable_path=executable, args=['--no-sandbox'])
        browser = pw.chromium.launch(**options)
        for width, height in [(390, 844), (1366, 900)]:
            context = browser.new_context(viewport={'width': width, 'height': height})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/app.html', wait_until='domcontentloaded')
            page.locator('#xsusLanguageSelect').wait_for()
            page.wait_for_function("document.querySelector('#stLanguage').value === document.documentElement.lang")
            headings = {}
            for lang in ('en', 'sq', 'fr', 'en'):
                page.locator('#xsusLanguageSelect').select_option(lang)
                page.wait_for_function('(language) => document.documentElement.lang === language && document.querySelector("#stLanguage").value === language', lang)
                headings[lang] = page.locator('.hero h1').inner_text()
            assert headings['en'] != headings['sq'] != headings['fr'], headings
            page.locator('#prompt').fill('USER_CONTENT_DO_NOT_TRANSLATE_739')
            page.locator('#xsusLanguageSelect').select_option('fr')
            assert page.locator('#prompt').input_value() == 'USER_CONTENT_DO_NOT_TRANSLATE_739'
            page.reload(wait_until='domcontentloaded')
            page.wait_for_function("document.documentElement.lang === 'fr'")
            assert page.locator('#xsusLanguageSelect').input_value() == 'fr'
            assert page.locator('#stLanguage').input_value() == 'fr'
            assert not errors, errors
            print(f'PASS {width}x{height}: EN/SQ/FR switching, selector sync, user text, persistence, JS errors')
            context.close()
        browser.close()
finally:
    server.shutdown()
