export function createRestoreIntent() {
  let current = null;
  const cancel = () => {
    const request = current; current = null;
    request?.controller.abort(new DOMException('Viewing intent superseded', 'AbortError'));
  };
  return {
    cancel,
    isPending: () => Boolean(current),
    async run({ signal, prepare, apply }) {
      cancel();
      const request = { controller: new AbortController() }; current = request;
      const combined = signal ? AbortSignal.any([signal, request.controller.signal]) : request.controller.signal;
      try {
        combined.throwIfAborted();
        await prepare(combined);
        if (combined.aborted || current !== request) return false;
        return apply();
      } catch (error) {
        if (combined.aborted || current !== request) return false;
        throw error;
      } finally { if (current === request) current = null; }
    },
  };
}
