class MentionAskQueue {
  constructor() {
    this.userQueues = new Map();
  }

  enqueue(userId, handlers) {
    const state = this.getOrCreateState(userId);
    const job = { handlers };

    if (state.running) {
      state.pending.push(job);
      return {
        queued: true,
        position: state.pending.length + 1,
      };
    }

    this.startJob(userId, state, job);

    return {
      queued: false,
      position: 1,
    };
  }

  getOrCreateState(userId) {
    let state = this.userQueues.get(userId);

    if (!state) {
      state = {
        pending: [],
        running: false,
      };
      this.userQueues.set(userId, state);
    }

    return state;
  }

  startJob(userId, state, job) {
    state.running = true;

    Promise.resolve()
      .then(() => job.handlers.onStart?.())
      .then(() => job.handlers.run())
      .catch((error) => job.handlers.onError?.(error))
      .finally(() => {
        state.running = false;

        const nextJob = state.pending.shift();

        if (nextJob) {
          this.startJob(userId, state, nextJob);
          return;
        }

        this.userQueues.delete(userId);
      });
  }
}

module.exports = { MentionAskQueue };
