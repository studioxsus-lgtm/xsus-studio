import unittest
from languages.sq.security_requests import analyze_security

class SecurityRequestTests(unittest.TestCase):
    def test_multiple(self):
        result = analyze_security("Shto sigurinë me autentikim, autorizim dhe izolim të të dhënave.")
        self.assertEqual(result.requested, ("authentication", "authorization", "data_isolation"))

    def test_mfa(self):
        result = analyze_security("Shto sigurinë me autentikim me dy faktorë")
        self.assertEqual(result.suggested_controls, ("authentication",))

    def test_roles(self):
        result = analyze_security("Konfiguro sigurinë me kontroll të roleve")
        self.assertEqual(result.suggested_controls, ("authentication", "authorization"))

    def test_explicit_dependency(self):
        result = analyze_security("Shto sigurinë me autentikim dhe skadim të sesioneve")
        self.assertEqual(result.suggested_controls, ())

    def test_encryption(self):
        result = analyze_security("Shto mbrojtjen me kriptim të të dhënave dhe kriptim gjatë transmetimit")
        self.assertEqual(result.requested, ("encryption_at_rest", "encryption_in_transit"))

    def test_privacy(self):
        result = analyze_security("Shto sigurinë me mbrojtje të privatësisë dhe regjistrim të auditimit")
        self.assertEqual(result.requested, ("privacy", "audit_logging"))

    def test_reject(self):
        for value in ("Mos shto sigurinë me autentikim", "Shto sigurinë me autentikim dhe hiq autorizimin", "Shto sigurinë me autentikim?", "Shto sigurinë me zzqx", "a"*4097):
            self.assertIsNone(analyze_security(value))

    def test_deduplication(self):
        self.assertEqual(analyze_security("Shto sigurinë me autentikim dhe autentikim").requested, ("authentication",))

    def test_no_execution(self):
        self.assertFalse(analyze_security("Shto sigurinë me autentikim").execution_authorized)

    def test_invalid(self):
        with self.assertRaises(TypeError):
            analyze_security(None)
