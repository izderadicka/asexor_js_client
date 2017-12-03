import {BaseClient, RemoteError} from './base-client';

const CALL_TIMEOUT = 10000; // timeout for exec to return task_id or fail

export class Client extends BaseClient {

    constructor(host, token, sessionId) {
        super();
        this.hostName = host;
        this.securityToken = token;
        this.sessionId = sessionId;
        this.ws = null;
        this.wasError = false;
        this.reconnectDelay = 1000;
        this._pendingCalls = new Map();

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
        let url = `${location.protocol ==='https:'?'wss:':'ws:'}//${this.hostName}/ws?token=${this.securityToken}`;
        if (this.sessionId) {
            url+= `&session_id=${this.sessionId}`;
        }
        this.ws = new WebSocket(url);

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
        //console.log('Message: ' + msg);
        let data = JSON.parse(msg);
        let [msg_type,call_id, payload, extra] = data;
        let resolveCall = (action, value) => {
            let callData = this._pendingCalls.get(call_id);
            if (callData) {
                this._pendingCalls.delete(call_id);
                window.clearTimeout(callData.to);
                callData[action](value);
            } else {
                console.error(`Unmached call_id: ${call_id}`)
            }
        };
        switch (msg_type) {
            case 'r':
                resolveCall('resolve', payload);
                break;
            case 'e':
                resolveCall('reject', new RemoteError(payload, extra));
                break;
            case 'm':
                if (!payload) {
                    console.error('Invalid update message - data missing');
                } else {
                    let taskId = payload.task_id;
                    if (!taskId) {
                        console.error('Invalid update message - task_id missing');
                    } else {
                        delete payload.task_id;
                        this.updateListeners(taskId, payload);
                    }
                }
        }
    }

    exec(task_name, args, kwargs) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not ready');
        }


        let call_id = this.next_call_id;
        this.ws.send(JSON.stringify([call_id, task_name, {args, kwargs}]));
        return new Promise((resolve, reject) => {
            let to = window.setTimeout(reject, CALL_TIMEOUT, new Error('Call timeout'));
            this._pendingCalls.set(call_id, {resolve, reject, ts: new Date(), to});
        })
    }

    close() {
        let ws = this.ws;
        this.ws = null;
        ws.close();
    }
};
