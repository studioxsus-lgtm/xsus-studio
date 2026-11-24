import unittest
from core.routing.sq_static_preview_adapter import prepare_preview_request, validate_preview_response

def manifest():
    return {"kind":"static-preview","requiresReview":True,"files":[
        {"path":"index.html","content":"<main>Preview</main>"},
        {"path":"styles.css","content":"main {}"},
        {"path":"main.js","content":"const ready = true;"}]}

class StaticPreviewAdapterTests(unittest.TestCase):
    def test_goal(self):
        self.assertEqual(prepare_preview_request(" Task manager "), {"goal":"Task manager"})

    def test_goal_bounds(self):
        for goal in ("", " ", "x"*101, None):
            with self.assertRaises(ValueError):
                prepare_preview_request(goal)

    def test_manifest(self):
        result = validate_preview_response(manifest())
        self.assertEqual(len(result.files), 3)
        self.assertTrue(result.requires_review)
        self.assertFalse(result.execution_authorized)

    def test_no_native_claim(self):
        with self.assertRaises(ValueError):
            validate_preview_response({**manifest(), "kind":"apk"})

    def test_review_required(self):
        for value in (False, 1, None):
            with self.assertRaises(ValueError):
                validate_preview_response({**manifest(), "requiresReview":value})

    def test_paths(self):
        for path in ("../main.js", "/main.js", "index.html", "app.apk"):
            data = manifest()
            data["files"][2]["path"] = path
            with self.assertRaises(ValueError):
                validate_preview_response(data)

    def test_content(self):
        for value in ("", None, "x"*250001):
            data = manifest()
            data["files"][2]["content"] = value
            with self.assertRaises(ValueError):
                validate_preview_response(data)

    def test_extra_fields(self):
        with self.assertRaises(ValueError):
            validate_preview_response({**manifest(), "execution_authorized":True})

    def test_missing_file(self):
        data = manifest()
        data["files"].pop()
        with self.assertRaises(ValueError):
            validate_preview_response(data)
