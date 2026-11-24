import unittest
from services.api.android_planning import plan_payload, attach_android_planning
from aiohttp import web

class AndroidPlanningEndpointTests(unittest.TestCase):
    def test_invalid_payload(self):
        with self.assertRaises(ValueError): plan_payload({})
    def test_no_implicit_profile(self):
        with self.assertRaises(ValueError): plan_payload(dict(project_id="p",prompts=["test"],application_id="com.xsus.tasks",display_name="Tasks",min_sdk=26,accept_storage_profile=False))
    def test_invalid_token(self):
        with self.assertRaises(ValueError): attach_android_planning(web.Application(),"short")
    def test_route_registration(self):
        app=web.Application()
        attach_android_planning(app,"x"*40)
        self.assertTrue(any(r.resource.canonical=="/internal/android/plan" for r in app.router.routes()))
