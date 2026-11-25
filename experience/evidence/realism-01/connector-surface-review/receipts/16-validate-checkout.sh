set -eu
surface_repository=/workspace/TourGuideAI
surface_checkout="$1"
surface_results="$2"
mkdir -p "$surface_results/temporary" "$surface_results/matplotlib"
export PYTHONDONTWRITEBYTECODE=1
export TMPDIR="$surface_results/temporary"
export MPLCONFIGDIR="$surface_results/matplotlib"
export PYTHONPATH="$surface_repository/artifacts/realism-01/connector-surface-evaluation/python:$surface_repository/artifacts/realism-01/connector-surface/python:$surface_repository/artifacts/realism-01/connector-surface-review/verification-python"
python "$surface_checkout/experience/tools/connector-surface-sources/intake.py" verify > "$surface_results/sources.json"
python "$surface_checkout/experience/tools/connector-surface/verify.py" --evidence "$surface_checkout/experience/evidence/realism-01/connector-surface/run-01" > "$surface_results/native-failure.json"
python "$surface_checkout/experience/tools/connector-surface/verify.py" --evidence "$surface_checkout/experience/evidence/realism-01/connector-surface/run-02" > "$surface_results/native-surface.json"
for surface_bundle in toolchain review-inputs texture-4096-01; do
  python "$surface_checkout/experience/tools/connector-surface/verify.py" --evidence "$surface_checkout/experience/evidence/realism-01/connector-surface/$surface_bundle" > "$surface_results/$surface_bundle.json"
done
python "$surface_checkout/experience/tools/connector-surface-qa/retain.py" --verify "$surface_checkout/experience/evidence/realism-01/connector-surface-qa" > "$surface_results/surface-qa.json"
python "$surface_checkout/experience/tools/connector-surface-evaluation/variant_evidence.py" --verify "$surface_checkout/experience/evidence/realism-01/connector-surface-evaluation/variant-4096" > "$surface_results/heldout-evaluation.json"
python "$surface_checkout/experience/tools/connector-surface-qa/retain_heldout.py" --verify "$surface_checkout/experience/evidence/realism-01/connector-surface-qa/heldout" > "$surface_results/independent-heldout.json"
python "$surface_checkout/experience/sprints/realism-01/verify.py" --root "$surface_checkout" > "$surface_results/sprint.json"
