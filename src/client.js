import {BaseClient, RemoteError} from './base-client';

export class Client extends BaseClient {

    constructor(host, token) {
        super();
        this.hostName = host;
        this.securityToken = token;
        this.ws = null;
        this.wasError = false;
        this.reconnectDelay = 1000;
        this._call_id = 1;
        this._pendingCalls = new Map();

    }

    get next_call_id() {
        return this._call_id++;
    }

    get active() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    _reconnect() {
        if (this.ws)
            window.setTimeout(() => this.connect(), this.reconnectDelay);
        }

    connect() {
        this.wasError = false;
        this.ws = new WebSocket(`ws://${this.hostName}/ws?token=${this.securityToken}`);

        return new Promise((resolve, reject) => {

            this.ws.onerror = (evt) => {
                console.error(`WebSocket error `);
                //reconnect
                this.wasError = true;
                this._reconnect();
            };

            this.ws.onopen = () => {

                this.ws.onopen = null;
                this.ws.onmessage = (evt) => this.processMessage(evt.data);
                this.ws.onclose = (evt) => {
                    console.log(`Websocket closed - clean ${evt.wasClean}, code ${evt.code}`);
                    document.dispatchEvent(new Event('asexor-client-close'));
                    if (evt.code !== 1000 && !this.wasError) {
                        this._reconnect()
                    } else {
                        reject(new Error(`WS connection problem (code ${evt.code})`));
                    }
                }
                console.log('WS connected');
                resolve();
                document.dispatchEvent(new Event('asexor-client-open'));
            };
        });
    }

    processMessage(msg) {
        console.log('Message: ' + msg);
        let data = JSON.parse(msg)
        let resolveCall = (action, value) => {
            let callData = this._pendingCalls.get(data.call_id);
            if (callData) {
                this._pendingCalls.delete(data.call_id);
                callData[action](value);
            } else {
                console.error(`Unmached call_id: ${call_id}`)
            }
        }
        switch (data.t) {
            case 'r':
                resolveCall('resolve', data.returned);
                break;
            case 'e':
                resolveCall('reject', new RemoteError(data.error, data.error_stack_trace));
                break;
            case 'm':
                let data = data.data;
                if (!data) {
                    console.error('Invalid update message - data missing');
                } else {
                    let taskId = data.task_id;
                    if (!taskId) {
                        console.error('Invalid update message - task_id missing');
                    } else {
                        delete data.task_id;
                        this.updateListeners(taskId, data);
                    }
                }
        }
    }

    exec(task_name, args, kwargs) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not ready');
        }

        let allArgs = [task_name].concat(args);
        let call_id = this.next_call_id;
        this.ws.send(JSON.stringify({call_id, args: allArgs, kwargs}));
        return new Promise((resolve, reject) => {
            this._pendingCalls.set(call_id, {resolve, reject, ts: new Date()})
        })
    }

    close() {
        let ws = this.ws;
        this.ws = null;
        ws.close();
    }
};
