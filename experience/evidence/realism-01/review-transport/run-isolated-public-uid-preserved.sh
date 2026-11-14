set -eu
review_root=/workspace/TourGuideAI
review_qa="$review_root/artifacts/realism-01/review-transport/qa"
review_temporary="$review_root/artifacts/review-transport-tmp"
review_node=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node
exec bwrap --unshare-user --unshare-pid --die-with-parent --new-session \
  --ro-bind / / --proc /proc --dev /dev \
  --bind "$review_qa" "$review_qa" \
  --bind "$review_temporary" "$review_temporary" \
  --bind "$review_temporary/nssdb" /home/agent/.pki/nssdb \
  --chdir "$review_root" \
  /usr/bin/env REVIEW_QA_TRUST_RECEIPT="$review_qa/trust-setup.json" \
  "$review_node" "$@"
