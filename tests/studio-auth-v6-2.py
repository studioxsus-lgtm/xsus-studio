from pathlib import Path
p=Path(__file__).resolve().parents[1]
h=(p/'app.html').read_text()
j=(p/'assets/js/xsus-app/studio-auth-bridge.js').read_text()
checks={
 'Login links in landing and builder':h.count('data-auth-login')==2,
 'Sign Up links in landing and builder':h.count('data-auth-signup')==2,
 'Account status in both headers':h.count('data-auth-status')==2,
 'Existing XSUS Studio auth endpoint': 'https://www.xsusstudio.com/auth.html' in h,
 'Same-origin session guard': 'window.location.origin === STUDIO_ORIGIN' in j,
 'Server-verified user call': 'supabase.auth.getUser()' in j,
 'Session updates': 'onAuthStateChange' in j,
 'No local authorization bypass': 'localStorage.setItem' not in j and 'auth.signInWithPassword' not in j,
 'Dedicated responsive stylesheet': 'studio-auth-bridge.css' in h,
 'Original logo preserved': 'assets/images/xsus-app/xsus-app-logo.png' in h,
 'Three languages': all('"Log in"' in (p/f'assets/js/xsus-app/i18n/{x}.js').read_text() for x in ['en','sq','fr']),
}
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),k)
assert all(checks.values())
print(f'{len(checks)} checks passed')
