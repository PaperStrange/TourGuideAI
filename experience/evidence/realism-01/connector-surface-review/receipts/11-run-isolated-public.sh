set -eu
review_root=/workspace/TourGuideAI
review_source="$review_root/artifacts/realism-01/connector-surface-review"
review_temporary="$review_root/artifacts/surface-browser-tmp"
review_node=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node
exec bwrap --unshare-user --uid 0 --gid 0 --unshare-pid --die-with-parent --new-session \
  --ro-bind / / --proc /proc --dev /dev \
  --bind "$review_source" "$review_source" \
  --bind "$review_temporary" "$review_temporary" \
  --bind "$review_source/nssdb" /home/agent/.pki/nssdb \
  --chdir "$review_root" \
  "$review_node" "$@"
