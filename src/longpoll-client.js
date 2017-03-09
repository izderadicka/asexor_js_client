import {BaseClient, RemoteError} from './base-client';

const COOKIE_NAME = 'ASEXOR_LP_SESSION';

function checkResponse(response) {
  if (! response.ok) throw new Error(`Response status: ${response.status}`);
  return response.json();
}

export class Client extends BaseClient {
  constructor(url, token) {
    super()
    this.url = url;
    this.token = token
    this._connected = false;
    this._call_id = 1;
  }


  connect() {
    return fetch(this.url, {'headers':{'Authorization': `Bearer ${this.token}`},
                            'credentials': 'include'})
    .then(checkResponse)
    .then(data => {
        document.dispatchEvent(new Event('asexor-client-open'));
        console.log('Client connected');
        this._connected = true;

        let poll = () => {
          if (this._connected) {
            fetch(this.url, {'credentials': 'include'})
            .then(checkResponse)
            .then(data=>{
              this.processUpdates(data);
              window.setTimeout(poll, 0);
              })
            .catch(err=> {
              console.error(`Long poll error ${err}`);
              this._connected = false;
            })
          }
        };

        poll();
    })

  }

  processUpdates(data) {
    if (Array.isArray(data)) {
      data.forEach(msg => {
        let [call_id, type, payload] = msg
        let taskId = payload.task_id;
        if (!taskId) {
            console.error('Invalid update message - task_id missing');
        } else {
            delete payload.task_id;
            this.updateListeners(taskId, payload);
        }
      })
    }
  }

  exec(task_name, args, kwargs) {

    let call_id = this.next_call_id;
    return fetch(this.url, {'method':'POST',
                      'credentials': 'include',
                      'headers': {'Content-Type':'application/json'},
                      'body': JSON.stringify([call_id, task_name, {args, kwargs}])
          })
          .then(checkResponse)
          .then(msg => {
            let [msg_type,call_id, payload, extra] = msg;
            if (msg_type === 'r') {
              return payload;
            } else if (msg_type === 'e') {
              throw new RemoteError(payload, extra);
            } else {
              console.error('Invalid response');
            }
          })
      
  }

  close() {
    this._connected = false;
  }

  get active() {
    return this._connected;
  }


}
