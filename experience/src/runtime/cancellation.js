// 编译无法中断底层任务；调用方立即取消等待，资源由实例统一释放。
export function waitForTask(task, signal) {
  if (!signal) return task;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    signal.addEventListener('abort', cancel, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}
