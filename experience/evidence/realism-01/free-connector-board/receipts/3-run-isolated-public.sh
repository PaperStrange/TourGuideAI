set -eu
review_root=/workspace/TourGuideAI
review_source="$review_root/artifacts/realism-01/free-connector-next"
review_temporary="$review_root/artifacts/board-tmp"
review_trust="$review_root/artifacts/review-transport-tmp/nssdb"
review_node=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node
exec bwrap --unshare-user --uid 0 --gid 0 --unshare-pid --die-with-parent --new-session \
  --ro-bind / / --proc /proc --dev /dev \
  --bind "$review_source" "$review_source" \
  --bind "$review_temporary" "$review_temporary" \
  --bind "$review_trust" /home/agent/.pki/nssdb \
  --chdir "$review_root" \
  "$review_node" "$@"
