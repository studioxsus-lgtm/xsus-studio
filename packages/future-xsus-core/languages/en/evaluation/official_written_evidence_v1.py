"""Reproducible, read-only official checkpoint comparison report."""
import argparse
import hashlib
import json
from pathlib import Path

from languages.en.evaluation.official_written_comparison_v1 import compare_official_written_benchmarks_v1
from languages.en.evaluation.official_written_assessment_v1 import assess_official_written_comparison_v1


def _sha256(path: Path):
    digest=hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda:source.read(65536),b""):
            digest.update(block)
    return digest.hexdigest()


def create_official_written_evidence_v1(baseline_path: Path,candidate_path: Path):
    """Evaluate real checkpoints; include exact input hashes and aggregate assessment."""
    if not isinstance(baseline_path,Path) or not isinstance(candidate_path,Path):
        raise ValueError("Checkpoint paths must be pathlib.Path")
    if baseline_path.resolve()==candidate_path.resolve():
        raise ValueError("Distinct checkpoint paths required")
    baseline_hash_before=_sha256(baseline_path)
    candidate_hash_before=_sha256(candidate_path)
    comparison=compare_official_written_benchmarks_v1(baseline_path,candidate_path)
    assessment=assess_official_written_comparison_v1(comparison)
    if (_sha256(baseline_path)!=baseline_hash_before
            or _sha256(candidate_path)!=candidate_hash_before):
        raise RuntimeError("Checkpoint changed during evaluation")
    return {
        "contract":"future-xsus-core.official-written-evidence.v1",
        "checkpoint_sha256":{"baseline":baseline_hash_before,"candidate":candidate_hash_before},
        "comparison":comparison,
        "assessment":assessment,
        "input_checkpoints_unchanged":True,
        "independent_provenance_authenticated":False,
        "release_authorized":False,
        "production_deployed":False,
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline",required=True,type=Path)
    parser.add_argument("--candidate",required=True,type=Path)
    args=parser.parse_args()
    print(json.dumps(create_official_written_evidence_v1(
        args.baseline,args.candidate),indent=2,sort_keys=True))


if __name__=="__main__":
    main()
