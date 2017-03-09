'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Client = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _baseClient = require('./base-client');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CALL_TIMEOUT = 10000; // timeout for exec to return task_id or fail

var Client = exports.Client = function (_BaseClient) {
    _inherits(Client, _BaseClient);

    function Client(host, token) {
        _classCallCheck(this, Client);

        var _this = _possibleConstructorReturn(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this));

        _this.hostName = host;
        _this.securityToken = token;
        _this.ws = null;
        _this.wasError = false;
        _this.reconnectDelay = 1000;
        _this._pendingCalls = new Map();

        return _this;
    }

    _createClass(Client, [{
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

            return new Promise(function (resolve, reject) {

                _this3.ws.onerror = function (evt) {
                    console.error('WebSocket error ');
                    //reconnect
                    _this3.wasError = true;
                    _this3._reconnect();
                };

                _this3.ws.onopen = function () {

                    _this3.ws.onopen = null;
                    _this3.ws.onmessage = function (evt) {
                        return _this3.processMessage(evt.data);
                    };
                    _this3.ws.onclose = function (evt) {
                        console.log('Websocket closed - clean ' + evt.wasClean + ', code ' + evt.code);
                        document.dispatchEvent(new Event('asexor-client-close'));
                        if (evt.code !== 1000 && !_this3.wasError) {
                            _this3._reconnect();
                        } else {
                            reject(new Error('WS connection problem (code ' + evt.code + ')'));
                        }
                    };
                    console.log('WS connected');
                    resolve();
                    document.dispatchEvent(new Event('asexor-client-open'));
                };
            });
        }
    }, {
        key: 'processMessage',
        value: function processMessage(msg) {
            var _this4 = this;

            //console.log('Message: ' + msg);
            var data = JSON.parse(msg);

            var _data = _slicedToArray(data, 4),
                msg_type = _data[0],
                call_id = _data[1],
                payload = _data[2],
                extra = _data[3];

            var resolveCall = function resolveCall(action, value) {
                var callData = _this4._pendingCalls.get(call_id);
                if (callData) {
                    _this4._pendingCalls.delete(call_id);
                    window.clearTimeout(callData.to);
                    callData[action](value);
                } else {
                    console.error('Unmached call_id: ' + call_id);
                }
            };
            switch (msg_type) {
                case 'r':
                    resolveCall('resolve', payload);
                    break;
                case 'e':
                    resolveCall('reject', new _baseClient.RemoteError(payload, extra));
                    break;
                case 'm':
                    if (!payload) {
                        console.error('Invalid update message - data missing');
                    } else {
                        var taskId = payload.task_id;
                        if (!taskId) {
                            console.error('Invalid update message - task_id missing');
                        } else {
                            delete payload.task_id;
                            this.updateListeners(taskId, payload);
                        }
                    }
            }
        }
    }, {
        key: 'exec',
        value: function exec(task_name, args, kwargs) {
            var _this5 = this;

            if (this.ws.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket not ready');
            }

            var call_id = this.next_call_id;
            this.ws.send(JSON.stringify([call_id, task_name, { args: args, kwargs: kwargs }]));
            return new Promise(function (resolve, reject) {
                var to = window.setTimeout(reject, CALL_TIMEOUT, new Error('Call timeout'));
                _this5._pendingCalls.set(call_id, { resolve: resolve, reject: reject, ts: new Date(), to: to });
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
        key: 'active',
        get: function get() {
            return this.ws && this.ws.readyState === WebSocket.OPEN;
        }
    }]);

    return Client;
}(_baseClient.BaseClient);

;