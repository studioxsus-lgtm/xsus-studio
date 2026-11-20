"""Opt-in V6 command-line diagnostics. No network or model execution."""
import argparse
import json
import sys
from ..text.analysis_api_v6 import analyze_text_v6
from ..text.batch_api_v6 import analyze_batch_v6
from .benchmark_v6 import benchmark_batch_v6
from dataclasses import asdict

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    single = commands.add_parser("analyze")
    single.add_argument("text")
    batch = commands.add_parser("batch")
    batch.add_argument("texts", nargs="+")
    bench = commands.add_parser("benchmark")
    bench.add_argument("texts", nargs="+")
    bench.add_argument("--iterations", type=int, default=5)
    args = parser.parse_args(argv)
    try:
        if args.command == "analyze":
            result = analyze_text_v6(args.text)
        elif args.command == "batch":
            result = analyze_batch_v6(args.texts)
        else:
            result = asdict(benchmark_batch_v6(args.texts, iterations=args.iterations))
    except ValueError as error:
        print(json.dumps({"error": "INVALID_INPUT", "message": str(error)}), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
