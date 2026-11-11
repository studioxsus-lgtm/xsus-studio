"""XSUS App browser smoke test. Requires: pip install playwright; chromium installed.
Run from project root: python tests/xsus-app/browser-language-v4-6.py
"""
from pathlib import Path
import os, shutil
from threading import Thread
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/app.html'
try:
    with sync_playwright() as pw:
        browser_path = os.environ.get('XSUS_CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        launch_options = {'headless': True}
        if browser_path: launch_options.update(executable_path=browser_path, args=['--no-sandbox'])
        browser = pw.chromium.launch(**launch_options)
        for width, height in [(390, 844), (1366, 900)]:
            page = browser.new_page(viewport={'width':width,'height':height})
            errors=[]
            page.on('pageerror', lambda err: errors.append(str(err)))
            page.goto(url, wait_until='domcontentloaded')
            page.locator('#xsusLanguageSelect').wait_for()
            original = page.locator('.hero h1').inner_text()
            samples = {}
            for language in ('sq','fr','en'):
                page.locator('#xsusLanguageSelect').select_option(language)
                page.wait_for_function('(lang) => document.documentElement.lang === lang', language)
                assert page.locator('#stLanguage').input_value() == language
                samples[language] = page.locator('.hero h1').inner_text()
            assert samples['sq'] != samples['en'], samples
            assert samples['fr'] != samples['en'], samples
            assert samples['en'] == original, samples
            page.locator('#xsusLanguageSelect').select_option('sq')
            page.reload(wait_until='domcontentloaded')
            page.wait_for_function("document.documentElement.lang === 'sq'")
            assert page.locator('#xsusLanguageSelect').input_value() == 'sq'
            assert not errors, errors
            print(f'PASS viewport {width}x{height}: switch, restore, persistence, JS errors')
            page.close()
        browser.close()
finally:
    server.shutdown()
