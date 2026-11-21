"""Independent read-only comparison on official English writing benchmarks."""
import argparse
import hashlib
import json
from pathlib import Path

from languages.en.evaluation.compare import load_cases, compare_checkpoint

_EN_ROOT=Path(__file__).resolve().parents[1]
_OFFICIAL={
    "written-v4":_EN_ROOT/"evaluation"/"quality-v4.jsonl",
    "written-v5":_EN_ROOT/"evaluation"/"quality-v5.jsonl",
}


def compare_official_written_benchmarks_v1(baseline_path: Path,candidate_path: Path):
    """Evaluate both checkpoints on the same unmodified official held-out cases."""
    if not isinstance(baseline_path,Path) or not isinstance(candidate_path,Path):
        raise ValueError("Checkpoint paths must be pathlib.Path")
    if baseline_path.resolve()==candidate_path.resolve():
        raise ValueError("Baseline and candidate must be distinct")
    if not baseline_path.is_file() or not candidate_path.is_file():
        raise ValueError("Both checkpoints must exist")
    benchmarks={}
    for name,path in sorted(_OFFICIAL.items()):
        cases=load_cases(path)
        baseline=compare_checkpoint(baseline_path,cases)
        candidate=compare_checkpoint(candidate_path,cases)
        if baseline["cases"]!=candidate["cases"] or baseline["cases"]!=len(cases):
            raise ValueError("Benchmark case count changed during evaluation")
        benchmarks[name]={
            "benchmark_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
            "cases":len(cases),
            "baseline":{"accepted":baseline["accepted"],"exact_matches":baseline["exact_matches"],
                        "preserved_all_facts":baseline["preserved_all_facts"]},
            "candidate":{"accepted":candidate["accepted"],"exact_matches":candidate["exact_matches"],
                         "preserved_all_facts":candidate["preserved_all_facts"]},
            "delta_accepted":candidate["accepted"]-baseline["accepted"],
            "delta_exact_matches":candidate["exact_matches"]-baseline["exact_matches"],
            "delta_preserved_all_facts":candidate["preserved_all_facts"]-baseline["preserved_all_facts"],
        }
    regression=any(row["delta_accepted"]<0 or row["delta_preserved_all_facts"]<0
                   for row in benchmarks.values())
    return {
        "contract":"future-xsus-core.official-written-comparison.v1",
        "benchmarks":benchmarks,
        "benchmark_regression_detected":regression,
        "candidate_automatically_approved":False,
        "human_release_required":True,
        "production_deployed":False,
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline",required=True,type=Path)
    parser.add_argument("--candidate",required=True,type=Path)
    args=parser.parse_args()
    print(json.dumps(compare_official_written_benchmarks_v1(
        args.baseline,args.candidate),indent=2,sort_keys=True))


if __name__=="__main__":
    main()
