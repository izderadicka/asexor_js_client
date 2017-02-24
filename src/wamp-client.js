import {BaseClient, RemoteError} from './base-client';
import autobahn from 'autobahn';

const WAMP_UPDATE_CHANNEL = 'eu.zderadicka.asexor.task_update';
const WAMP_REMOTE_PROCEDURE = 'eu.zderadicka.asexor.run_task';

export class Client extends BaseClient {
    constructor(url, realm, userId, userToken) {
        super();
        this.session = null;
        this.connection = new autobahn.Connection({
            url: url,
            realm: realm,
            authmethods: ["ticket"],
            authid: userId,
            onchallenge: (session, method, extra) => {
                console.log(`Authentication required, method ${method}`);
                if (method === 'ticket') {
                    return userToken;
                } else {
                    throw new Error('Invalid auth method');
                }
            }
        });

    }

    _taskUpdated(args, kwargs) {
        let taskId = args[0];
        if (!taskId) {
            console.error('Invalid update message - no task_id');
        } else {
            this.updateListeners(taskId, kwargs);
        }
    }

    connect() {
        let p = new Promise((resolve, reject) => {

            this.connection.onopen = (session) => {
                console.log('WAMP Connection opened', session);
                session.subscribe(WAMP_UPDATE_CHANNEL, (args, kwargs) => this._taskUpdated(args, kwargs));
                this.session = session;
                resolve();
                document.dispatchEvent(new Event('asexor-client-open'));
            }

            this.connection.onclose = (reason, details) => {
                console.log('WAMP Connection closed', reason, details);
                this.session = null;
                reject(new Error(`Connection problem: ${reason}`));
                document.dispatchEvent(new Event('asexor-client-close'));
            }
        });
        this.connection.open();
        return p;
    }

    exec(task_name, args, kwargs) {
        if (!this.active)
            throw new Error('WAMP session is not active');
        return this.session.call(WAMP_REMOTE_PROCEDURE, [task_name].concat(args), kwargs)
    }

    close() {
        this.connection.close();
        this.session = null;
    }

    get active() {
        return this.session
    }
}
