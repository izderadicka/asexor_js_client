'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteError = function (_Error) {
    _inherits(RemoteError, _Error);

    function RemoteError(message, remoteStackTrace) {
        _classCallCheck(this, RemoteError);

        var _this = _possibleConstructorReturn(this, (RemoteError.__proto__ || Object.getPrototypeOf(RemoteError)).call(this, message));

        _this.remoteStackTrace = remoteStackTrace;
        return _this;
    }

    _createClass(RemoteError, [{
        key: 'toString',
        value: function toString() {
            return 'Remote Error: ' + this.message + '\n' + this.remoteStackTrace;
        }
    }]);

    return RemoteError;
}(Error);

;

var Client = exports.Client = function () {
    function Client(host, token) {
        _classCallCheck(this, Client);

        this.hostName = host;
        this.securityToken = token;
        this.ws = null;
        this.listeners = new Set();
        this.wasError = false;
        this.reconnectDelay = 1000;
        this._call_id = 1;
        this._pendingCalls = new Map();
    }

    _createClass(Client, [{
        key: 'subscribe',
        value: function subscribe(handler) {
            this.listeners.add(handler);
        }
    }, {
        key: 'unsubscribe',
        value: function unsubscribe(handler) {
            this.listeners.delete(handler);
        }
    }, {
        key: 'unsubscribeAll',
        value: function unsubscribeAll() {
            this.listeners.clear();
        }
    }, {
        key: '_reconnect',
        value: function _reconnect() {
            var _this2 = this;

            if (this.ws) window.setTimeout(function () {
                return _this2.connect();
            }, this.reconnectDelay);
        }
    }, {
        key: 'connect',
        value: function connect() {
            var _this3 = this;

            this.wasError = false;
            this.ws = new WebSocket('ws://' + this.hostName + '/ws?token=' + this.securityToken);
            this.ws.onerror = function (evt) {
                console.error('WebSocket error ');
                //reconnect
                _this3.wasError = true;
                _this3._reconnect();
            };
            return new Promise(function (resolve, reject) {
                _this3.ws.onopen = function () {

                    _this3.ws.onopen = null;
                    _this3.ws.onmessage = function (evt) {
                        return _this3.processMessage(evt.data);
                    };
                    _this3.ws.onclose = function (evt) {
                        console.log('Websocket closed - clean ' + evt.wasClean + ', code ' + evt.code);
                        document.dispatchEvent(new Event('ws-client-close'));
                        if (evt.code !== 1000 && !_this3.wasError) {
                            _this3._reconnect();
                        }
                    };
                    console.log('WS connected');
                    resolve();
                    document.dispatchEvent(new Event('ws-client-open'));
                };
            });
        }
    }, {
        key: 'processMessage',
        value: function processMessage(msg) {
            var _this4 = this;

            console.log('Message: ' + msg);
            var data = JSON.parse(msg);
            var resolveCall = function resolveCall(action, value) {
                var callData = _this4._pendingCalls.get(data.call_id);
                if (callData) {
                    _this4._pendingCalls.delete(data.call_id);
                    callData[action](value);
                } else {
                    console.error('Unmached call_id: ' + call_id);
                }
            };
            switch (data.t) {
                case 'r':
                    resolveCall('resolve', data.returned);
                    break;
                case 'e':
                    resolveCall('reject', new RemoteError(data.error, data.error_stack_trace));
                    break;
                case 'm':
                    this.listeners.forEach(function (handler) {
                        return handler(data.data);
                    });
            }
        }
    }, {
        key: 'exec',
        value: function exec(args, kwargs) {
            var _this5 = this;

            if (this.ws.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket not ready');
            }
            var call_id = this.next_call_id;
            this.ws.send(JSON.stringify({ call_id: call_id, args: args, kwargs: kwargs }));
            return new Promise(function (resolve, reject) {
                _this5._pendingCalls.set(call_id, { resolve: resolve, reject: reject, ts: new Date() });
            });
        }
    }, {
        key: 'close',
        value: function close() {
            var ws = this.ws;
            this.ws = null;
            ws.close();
        }
    }, {
        key: 'next_call_id',
        get: function get() {
            return this._call_id++;
        }
    }, {
        key: 'active',
        get: function get() {
            return this.ws && this.ws.readyState === WebSocket.OPEN;
        }
    }]);

    return Client;
}();

;