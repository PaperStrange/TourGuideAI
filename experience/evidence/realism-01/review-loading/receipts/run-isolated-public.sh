set -eu
review_root=/workspace/TourGuideAI
review_loading="$review_root/artifacts/realism-01/review-loading"
review_previous="$review_root/artifacts/realism-01/review-transport/qa"
review_temporary="$review_root/artifacts/review-transport-tmp"
review_current_temporary="$review_root/artifacts/review-loading-tmp"
review_node=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node
exec bwrap --unshare-user --uid 0 --gid 0 --unshare-pid --die-with-parent --new-session \
  --ro-bind / / --proc /proc --dev /dev \
  --bind "$review_loading" "$review_loading" \
  --bind "$review_previous" "$review_previous" \
  --bind "$review_temporary" "$review_temporary" \
  --bind "$review_current_temporary" "$review_current_temporary" \
  --bind "$review_temporary/xkb" /var/lib/xkb \
  --bind "$review_temporary/nssdb" /home/agent/.pki/nssdb \
  --chdir "$review_root" \
  "$review_node" "$@"
