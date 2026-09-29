"""Render the rubric replicas-vs-offered-load chart from a committed HPA measurement CSV.

The CSV (docs/evidence/hpa-timeline-run2.csv) is built from real captures: k6's own per-second
`vus` and `http_reqs` samples (offered load) joined with timestamped `kubectl get hpa` samples.
"""

from csv import DictReader
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "evidence" / "hpa-timeline-run2.csv"
OUTPUT = ROOT / "docs" / "evidence" / "scaling-chart.png"


with SOURCE.open(encoding="utf-8") as handle:
    rows = list(DictReader(handle))

times = [datetime.fromisoformat(row["timestamp"]) for row in rows]
elapsed = [(stamp - times[0]).total_seconds() for stamp in times]
vus = [float(row["vus"]) for row in rows]
rps = [float(row["rps"]) for row in rows]
cpu = [float(row["cpu_percent"]) if row["cpu_percent"] else float("nan") for row in rows]
replicas = [int(row["replicas"]) for row in rows]

plt.style.use("seaborn-v0_8-whitegrid")
figure, (load_axis, cpu_axis) = plt.subplots(
    2, 1, figsize=(11, 7.5), dpi=160, sharex=True, gridspec_kw={"height_ratios": [3, 1.4]},
)
replica_axis = load_axis.twinx()

load_axis.plot(elapsed, vus, color="#e5487f", linewidth=2.4, label="Offered load (k6 virtual users)")
load_axis.plot(elapsed, [value / 10 for value in rps], color="#f4a261", linewidth=1.4,
               linestyle=":", label="Throughput (requests/s ÷ 10)")
replica_axis.step(elapsed, replicas, where="post", color="#087e8b", linewidth=3, label="Backend replicas")

load_axis.set_title("CivicPulse HPA: replicas against offered load (k6 through the Ingress)",
                    fontsize=14, weight="bold")
load_axis.set_ylabel("Virtual users", color="#e5487f")
replica_axis.set_ylabel("Backend replicas", color="#087e8b")
replica_axis.set_ylim(0, 10.5)
replica_axis.set_yticks(range(0, 11))

cpu_axis.plot(elapsed, cpu, color="#6d597a", marker="o", markersize=3, linewidth=1.8,
              label="Average CPU / request")
cpu_axis.axhline(60, color="#9b5de5", linestyle="--", linewidth=1.4, label="HPA target (60%)")
cpu_axis.set_ylabel("CPU (%)")
cpu_axis.set_xlabel("Seconds since first sample")
cpu_axis.legend(loc="upper right", frameon=True, facecolor="white", framealpha=1.0, fontsize=9)

lines = load_axis.get_lines() + replica_axis.get_lines()
load_axis.legend(lines, [line.get_label() for line in lines], loc="upper left", frameon=True,
                 facecolor="white", framealpha=1.0)
figure.text(0.01, 0.01, "Source: docs/evidence/hpa-timeline-run2.csv (k6 samples + kubectl get hpa)",
            fontsize=9)
figure.tight_layout(rect=(0, 0.03, 1, 1))
figure.savefig(OUTPUT)
print(f"Wrote {OUTPUT}")
