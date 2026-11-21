"""Read-only, bounded inspection of candidate outputs after interrupted training."""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import os
import stat


@dataclass(frozen=True, slots=True)
class CandidateArtifactInspectionRequestV1:
    report_path: Path
    candidate_path: Path
    training_path: Path
    max_bytes_per_artifact: int = 20_000_000


def _inspect_file(path: Path, limit: int):
    # Never follow symlinks, including when an artifact is inspected by an operator.
    if path.is_symlink():
        return {"status":"unsafe","sha256":None,"size":None}
    try:
        descriptor=os.open(path,os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0))
    except FileNotFoundError:
        return {"status":"missing","sha256":None,"size":None}
    except OSError:
        return {"status":"unsafe","sha256":None,"size":None}
    try:
        info=os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1:
            return {"status":"unsafe","sha256":None,"size":None}
        if info.st_size>limit:
            return {"status":"oversized","sha256":None,"size":info.st_size}
        digest=hashlib.sha256()
        total=0
        while True:
            block=os.read(descriptor,min(65536,limit+1-total))
            if not block:
                break
            total+=len(block)
            if total>limit:
                return {"status":"oversized","sha256":None,"size":total}
            digest.update(block)
        return {"status":"present","sha256":digest.hexdigest(),"size":total}
    finally:
        os.close(descriptor)


def inspect_candidate_artifacts_v1(request: CandidateArtifactInspectionRequestV1):
    """Inventory files; does not assert their integrity, provenance, or fitness."""
    if not isinstance(request,CandidateArtifactInspectionRequestV1):
        raise ValueError("CandidateArtifactInspectionRequestV1 required")
    paths={"report":request.report_path,"candidate":request.candidate_path,
           "training":request.training_path}
    if (any(not isinstance(p,Path) for p in paths.values())
            or type(request.max_bytes_per_artifact) is not int
            or not 1<=request.max_bytes_per_artifact<=100_000_000):
        raise ValueError("Invalid artifact paths or size limit")
    if len({str(p.absolute()) for p in paths.values()})!=len(paths):
        raise ValueError("Artifact paths must be distinct")
    artifacts={name:_inspect_file(path,request.max_bytes_per_artifact)
               for name,path in paths.items()}
    return {
        "contract":"future-xsus-core.candidate-artifact-inspection.v1",
        "artifacts":artifacts,
        "all_present":all(a["status"]=="present" for a in artifacts.values()),
        "requires_manual_review":True,
        "artifact_provenance_verified":False,
        "model_quality_verified":False,
        "automatic_resume_authorized":False,
        "release_authorized":False,
    }
