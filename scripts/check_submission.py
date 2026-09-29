"""Mechanical pre-submission checks for the CivicPulse assignment.

This is intentionally a lint, not a grader. It never prints a matched credential value.
"""

from __future__ import annotations

import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []
WARNINGS: list[str] = []


def git(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, check=False, capture_output=True, text=True, encoding="utf-8",
    )
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout


def require_paths() -> None:
    required = (
        "backend/Dockerfile",
        "backend/.dockerignore",
        "frontend/Dockerfile",
        "frontend/.dockerignore",
        "compose.yaml",
        "compose.prod.yaml",
        "k8s/base/kustomization.yaml",
        "k8s/base/secret.yaml",
        "k8s/overlays/dev/kustomization.yaml",
        "k8s/overlays/prod/kustomization.yaml",
        "load/k6-script.js",
        "docs/ENGINEERING-NOTES.md",
        "docs/RUNBOOK.md",
        "docs/AI-USAGE.md",
        "docs/TRIAGE.md",
        "docs/EVIDENCE-GUIDE.md",
        "docs/SUBMISSION-REPORT.md",
        "docs/adr/0001-provider-interface.md",
        "docs/adr/0002-frontend-runtime-config.md",
        "docs/adr/0003-deploy-by-sha.md",
        "docs/adr/0004-pii-and-data-governance.md",
        ".github/workflows/ci.yml",
        ".github/workflows/cd.yml",
        ".github/workflows/release.yml",
        "README.md",
        "LICENSE",
    )
    for relative in required:
        if not (ROOT / relative).exists():
            ERRORS.append(f"missing required path: {relative}")

    expected_evidence = (
        "docs/evidence/branch-protection.png",
        "docs/evidence/blocked-merge.png",
        "docs/evidence/green-pipeline.png",
        "docs/evidence/merge-conflict.md",
        "docs/evidence/hpa-watch.txt",
        "docs/evidence/scaling-chart.png",
        "docs/evidence/vpa-recommendations.txt",
    )
    for relative in expected_evidence:
        if not (ROOT / relative).exists():
            WARNINGS.append(f"real evidence still needed: {relative}")


def check_history() -> None:
    total = int(git("rev-list", "--count", "--all").strip())
    if total < 35:
        ERRORS.append(f"commit floor not met: {total}/35 commits")

    author_lines = git("log", "--all", "--use-mailmap", "--format=%aN").splitlines()
    counts = Counter(author_lines)
    for author, count in counts.most_common():
        share = count / total * 100 if total else 0
        print(f"  author share: {author}: {count} commits ({share:.1f}%)")
        if share < 35:
            ERRORS.append(f"author below 35%: {author} has {share:.1f}%")
    if len(counts) != 2:
        WARNINGS.append(f"expected two contributing authors; found {len(counts)}")

    conventional = re.compile(r"^(feat|fix|docs|chore|ci|test|refactor|build|perf|style)(\([^)]+\))?!?: ")
    old_style = [subject for subject in git("log", "--all", "--format=%s").splitlines() if not conventional.match(subject)]
    if old_style:
        WARNINGS.append(
            f"{len(old_style)} commit subject(s) lack a conventional prefix; do not rewrite shared history casually"
        )

    history_names = set(git("log", "--all", "--name-only", "--pretty=format:").splitlines())
    leaked_env_names = sorted(
        name for name in history_names
        if name and Path(name).name.startswith(".env") and Path(name).name != ".env.example"
    )
    if leaked_env_names:
        ERRORS.append(f"environment file present in Git history: {', '.join(leaked_env_names)}")

    secret_ere = (
        r"gsk_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|"
        r"sk_(live|test)_[A-Za-z0-9]{20,}|pk_(live|test)_[A-Za-z0-9]{20,}"
    )
    for commit in git("rev-list", "--all").splitlines():
        matches = git("grep", "-I", "-l", "-E", secret_ere, commit, "--", ".", check=False).splitlines()
        if matches:
            paths = sorted({line.split(":", 1)[-1] for line in matches})
            ERRORS.append(f"likely credential in commit {commit[:8]} (paths only): {', '.join(paths)}")


def service_block(text: str, name: str) -> str:
    match = re.search(rf"(?ms)^  {re.escape(name)}:\s*\n(.*?)(?=^  [A-Za-z0-9_-]+:\s*$|^networks:|^volumes:|\Z)", text)
    return match.group(1) if match else ""


def check_compose_and_images() -> None:
    prod_path = ROOT / "compose.prod.yaml"
    if not prod_path.exists():
        return
    prod = prod_path.read_text(encoding="utf-8")
    if re.search(r"(?m)^\s+build\s*:", prod):
        ERRORS.append("compose.prod.yaml contains build:; production must deploy published images")
    if "${IMAGE_TAG" not in prod:
        ERRORS.append("compose.prod.yaml does not use IMAGE_TAG")
    for service in ("postgres", "redis"):
        block = service_block(prod, service)
        if not block:
            ERRORS.append(f"compose.prod.yaml is missing {service}")
        elif re.search(r"(?m)^    ports\s*:", block):
            ERRORS.append(f"compose.prod.yaml publishes the {service} port")

    for dockerfile in (ROOT / "backend/Dockerfile", ROOT / "frontend/Dockerfile"):
        if not dockerfile.exists():
            continue
        for line in dockerfile.read_text(encoding="utf-8").splitlines():
            if line.startswith("FROM "):
                image = line.split()[1]
                if ":" not in image or image.endswith(":latest"):
                    ERRORS.append(f"unpinned base image in {dockerfile.relative_to(ROOT)}: {image}")

    deployed_files = [ROOT / "compose.prod.yaml", *sorted((ROOT / "k8s").rglob("*.yaml"))]
    for path in deployed_files:
        if path.exists() and re.search(r"(?m)^\s*image:\s*\S+:latest\s*$", path.read_text(encoding="utf-8")):
            ERRORS.append(f"mutable :latest is deployed in {path.relative_to(ROOT)}")


def check_kubernetes() -> None:
    k8s = "\n".join(path.read_text(encoding="utf-8") for path in sorted((ROOT / "k8s").rglob("*.yaml")))
    checks = {
        "PostgreSQL StatefulSet": "kind: StatefulSet",
        "persistent volume claim": "volumeClaimTemplates:",
        "Ingress": "kind: Ingress",
        "HPA v2": "apiVersion: autoscaling/v2",
        "VPA": "kind: VerticalPodAutoscaler",
        "VPA recommender mode": 'updateMode: "Off"',
        "PodDisruptionBudget": "kind: PodDisruptionBudget",
        "startup probe": "startupProbe:",
        "liveness probe": "livenessProbe:",
        "readiness probe": "readinessProbe:",
        "resource requests": "requests:",
        "resource limits": "limits:",
    }
    for label, needle in checks.items():
        if needle not in k8s:
            ERRORS.append(f"Kubernetes requirement missing: {label}")
    secret = (ROOT / "k8s/base/secret.yaml").read_text(encoding="utf-8")
    values = re.findall(r"(?m)^  [A-Z0-9_]+:\s*(.+)$", secret.split("stringData:", 1)[-1])
    if any(value.strip() != "replace-me" for value in values):
        ERRORS.append("k8s/base/secret.yaml contains a non-placeholder value")


def check_workflows() -> None:
    cd_path = ROOT / ".github/workflows/cd.yml"
    if not cd_path.exists():
        return
    cd = cd_path.read_text(encoding="utf-8")
    expectations = {
        "build-push is gated by test": r"(?ms)^  build-push:\n    needs: test$",
        "deploy-k8s is gated by build-push": r"(?ms)^  deploy-k8s:\n    needs: build-push$",
        "images use commit SHA": r"github\.sha|GITHUB_SHA",
        "least-privilege package write": r"packages: write",
        "rollout wait": r"kubectl .*rollout status",
        "Ingress smoke": r"Smoke-test through the Ingress",
    }
    for label, pattern in expectations.items():
        if not re.search(pattern, cd):
            ERRORS.append(f"CD requirement missing: {label}")


def main() -> int:
    print("CivicPulse submission preflight")
    require_paths()
    check_history()
    check_compose_and_images()
    check_kubernetes()
    check_workflows()

    for warning in WARNINGS:
        print(f"WARNING: {warning}")
    for error in ERRORS:
        print(f"ERROR: {error}")
    print(f"Result: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s)")
    return 1 if ERRORS else 0


if __name__ == "__main__":
    sys.exit(main())
