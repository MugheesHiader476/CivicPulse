"""Render the rubric scaling chart from the committed HPA measurement CSV."""

from csv import DictReader
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "evidence" / "hpa-timeline.csv"
OUTPUT = ROOT / "docs" / "evidence" / "scaling-chart.png"


with SOURCE.open(encoding="utf-8") as handle:
    rows = list(DictReader(handle))

times = [datetime.fromisoformat(row["timestamp"]) for row in rows]
elapsed = [(stamp - times[0]).total_seconds() for stamp in times]
cpu = [int(row["cpu_percent"]) for row in rows]
replicas = [int(row["replicas"]) for row in rows]

plt.style.use("seaborn-v0_8-whitegrid")
figure, cpu_axis = plt.subplots(figsize=(11, 6), dpi=160)
replica_axis = cpu_axis.twinx()

cpu_axis.plot(elapsed, cpu, color="#e5487f", marker="o", linewidth=2.4, label="CPU utilization")
cpu_axis.axhline(60, color="#9b5de5", linestyle="--", linewidth=1.6, label="HPA target (60%)")
replica_axis.step(elapsed, replicas, where="post", color="#087e8b", linewidth=3, label="Backend replicas")

cpu_axis.set_title("CivicPulse Kubernetes autoscaling under k6 load", fontsize=15, weight="bold")
cpu_axis.set_xlabel("Seconds since first captured HPA sample")
cpu_axis.set_ylabel("Average backend CPU utilization (%)", color="#e5487f")
replica_axis.set_ylabel("Backend replicas", color="#087e8b")
replica_axis.set_ylim(1, 10)
replica_axis.set_yticks(range(2, 11))

lines = cpu_axis.get_lines() + replica_axis.get_lines()
cpu_axis.legend(
    lines,
    [line.get_label() for line in lines],
    loc="upper right",
    frameon=True,
    facecolor="white",
    framealpha=1.0,
)
figure.text(
    0.01,
    0.01,
    "Source: docs/evidence/hpa-timeline.csv · 150,559 requests · 0 failures · p95 252.38 ms",
    fontsize=9,
)
figure.tight_layout(rect=(0, 0.04, 1, 1))
figure.savefig(OUTPUT)
print(f"Wrote {OUTPUT}")
