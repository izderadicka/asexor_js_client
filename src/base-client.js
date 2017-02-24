export class RemoteError extends Error {
    constructor(message, remoteStackTrace) {
        super(message);
        this.message = message;
        this.remoteStackTrace = remoteStackTrace;
    }

    toString() {
      let msg = `Remote Error: ${this.message}`;
      if (this.remoteStackTrace)
        msg=msg+`\n${this.remoteStackTrace}`;
      return msg;
    }
};


export class BaseClient {
  constructor() {
    if (new.target === BaseClient)
      throw new TypeError('Cannot instantiate abstract class');
    this.listeners = new Set();
  }

  subscribe(handler) {
      this.listeners.add(handler);
  }

  unsubscribe(handler) {
      this.listeners.delete(handler);
  }

  unsubscribeAll() {
      this.listeners.clear();
  }

  updateListeners(taskId, data) {
    this.listeners.forEach((handler) => handler(taskId, data));
  }

  // abstact
  connect() {
    throw new TypeError('Must override this method');
  }

  // abstract
  exec(task_name, args, kwargs) {
    throw new TypeError('Must override this method');
  }

  // abstract
  close() {
    throw new TypeError('Must override this method');
  }

  // abstract
  get active() {
    throw new TypeError('Must override this method');
  }
}
