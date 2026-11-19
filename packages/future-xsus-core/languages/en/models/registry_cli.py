"""Explicitly promote, inspect, or roll back local XSUS English model revisions."""

import argparse
import json
from pathlib import Path

from languages.en.models.registry import EnglishModelRegistry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", required=True, type=Path, help="External local model-registry directory")
    actions = parser.add_subparsers(dest="action", required=True)

    promote = actions.add_parser("promote", help="Re-evaluate and explicitly activate a candidate checkpoint")
    promote.add_argument("--candidate", required=True, type=Path)
    promote.add_argument("--report", required=True, type=Path)
    promote.add_argument("--confirm-revision", required=True, help="Exact sha256 revision shown by the learning report")

    rollback = actions.add_parser("rollback", help="Restore a previously published revision")
    rollback.add_argument("--target-revision", required=True)
    rollback.add_argument("--confirm-current-revision", required=True, help="Exact active revision being replaced")

    actions.add_parser("releases", help="List immutable revisions in this registry")
    actions.add_parser("active", help="Show the verified active checkpoint revision and path")
    show = actions.add_parser("show", help="Verify and display a published revision's evaluation report")
    show.add_argument("--revision", required=True)
    args = parser.parse_args()
    registry = EnglishModelRegistry(args.registry)
    if args.action == "promote":
        result = registry.promote_candidate(
            args.candidate, args.report, confirm_revision=args.confirm_revision,
        )
    elif args.action == "rollback":
        result = registry.rollback(args.target_revision, confirm_current_revision=args.confirm_current_revision)
    elif args.action == "active":
        result = {"active": registry.active()}
    elif args.action == "show":
        result = {"revision": args.revision, "report": registry.release_report(args.revision)}
    else:
        result = {"releases": registry.releases()}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
