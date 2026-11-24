"""Material 3 UI planning for Android; no source generation or execution."""
from dataclasses import dataclass
from core.routing.sq_android_plan import AndroidPlan, prepare_android_plan
from languages.sq.project_context import ProjectContext

_COLORS = {"blue":"#2563EB", "green":"#15803D", "purple":"#7C3AED",
           "red":"#B91C1C", "white":"#FFFFFF", "black":"#000000"}
_OPTIONS = frozenset(("animation","no_animation","bottom_navigation","sidebar","responsive","modern_typography"))

@dataclass(frozen=True, slots=True)
class AndroidUIPlan:
    android: AndroidPlan
    design_system: str
    toolkit: str
    style: str
    theme: str
    primary_seed: str
    navigation: str
    motion: str
    adaptive_layout: bool
    typography: str
    accessibility_requirements: tuple[str, ...]
    required_files: tuple[str, ...]
    execution_authorized: bool = False

def prepare_android_ui(context: ProjectContext, application_id: str, display_name: str, min_sdk: int = 26) -> AndroidUIPlan:
    android = prepare_android_plan(context, application_id, display_name, min_sdk)
    design = context.design
    style = design.style if design else "modern"
    theme = (design.theme or "system") if design else "system"
    color = (design.primary_color or "blue") if design else "blue"
    options = frozenset(design.options) if design else frozenset()
    if style not in ("modern","minimalist","professional") or theme not in ("system","dark","light") or color not in _COLORS or not options <= _OPTIONS:
        raise ValueError("Unsupported design")
    if {"animation","no_animation"} <= options or {"bottom_navigation","sidebar"} <= options:
        raise ValueError("Conflicting design preferences")
    navigation = "bottom_bar" if "bottom_navigation" in options else "drawer" if "sidebar" in options else "single_screen"
    motion = "disabled" if "no_animation" in options else "enabled" if "animation" in options else "system"
    source = "app/src/main/java/" + application_id.replace(".", "/") + "/ui/"
    files = android.required_files + tuple(source + name for name in ("AppScreen.kt","AppNavigation.kt","AppTypography.kt","AppColors.kt"))
    return AndroidUIPlan(android, "material3", "jetpack_compose", style, theme,
                         _COLORS[color], navigation, motion, "responsive" in options,
                         "modern" if "modern_typography" in options else "material_default",
                         ("contrast_validation","semantic_labels","48dp_touch_targets","font_scaling","respect_reduced_motion"), files)
