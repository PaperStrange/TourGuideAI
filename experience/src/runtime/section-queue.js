// 下载与解析分别限流；取消排队任务不会占用下一项的并发名额。
export function createTaskQueue(concurrency) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Invalid task concurrency');
  const waiting = [];
  let active = 0, peak = 0, disposed = false;
  function pump() {
    while (!disposed && active < concurrency && waiting.length) {
      const task = waiting.shift();
      task.signal?.removeEventListener('abort', task.abort);
      if (task.signal?.aborted) { task.reject(task.signal.reason); continue; }
      active++; peak = Math.max(peak, active);
      Promise.resolve().then(() => task.run()).then(task.resolve, task.reject).finally(() => { active--; pump(); });
    }
  }
  return {
    run(run, signal) {
      if (disposed || signal?.aborted) return Promise.reject(signal?.reason ?? new DOMException('Queue disposed', 'AbortError'));
      return new Promise((resolve, reject) => {
        const task = { run, signal, resolve, reject, abort() {
          const index = waiting.indexOf(task);
          if (index >= 0) { waiting.splice(index, 1); reject(signal.reason); }
        } };
        signal?.addEventListener('abort', task.abort, { once: true }); waiting.push(task); pump();
      });
    },
    snapshot: () => ({ active, queued: waiting.length, peak, concurrency }),
    dispose() {
      disposed = true;
      for (const task of waiting.splice(0)) {
        task.signal?.removeEventListener('abort', task.abort);
        task.reject(new DOMException('Queue disposed', 'AbortError'));
      }
    },
  };
}
