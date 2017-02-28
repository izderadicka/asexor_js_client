'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Client = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _baseClient = require('./base-client');

var _autobahn = require('autobahn');

var _autobahn2 = _interopRequireDefault(_autobahn);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WAMP_UPDATE_CHANNEL = 'eu.zderadicka.asexor.task_update';
var WAMP_REMOTE_PROCEDURE = 'eu.zderadicka.asexor.run_task';

var Client = exports.Client = function (_BaseClient) {
    _inherits(Client, _BaseClient);

    function Client(url, realm, userId, userToken) {
        _classCallCheck(this, Client);

        var _this = _possibleConstructorReturn(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this));

        _this.session = null;
        _this.connection = new _autobahn2.default.Connection({
            url: url,
            realm: realm,
            authmethods: ["ticket"],
            authid: userId,
            onchallenge: function onchallenge(session, method, extra) {
                console.log('Authentication required, method ' + method);
                if (method === 'ticket') {
                    return userToken;
                } else {
                    throw new Error('Invalid auth method');
                }
            }
        });

        return _this;
    }

    _createClass(Client, [{
        key: '_taskUpdated',
        value: function _taskUpdated(args, kwargs) {
            var taskId = args[0];
            if (!taskId) {
                console.error('Invalid update message - no task_id');
            } else {
                this.updateListeners(taskId, kwargs);
            }
        }
    }, {
        key: 'connect',
        value: function connect() {
            var _this2 = this;

            var p = new Promise(function (resolve, reject) {

                _this2.connection.onopen = function (session) {
                    console.log('WAMP Connection opened', session);
                    session.subscribe(WAMP_UPDATE_CHANNEL, function (args, kwargs) {
                        return _this2._taskUpdated(args, kwargs);
                    });
                    _this2.session = session;
                    resolve();
                    document.dispatchEvent(new Event('asexor-client-open'));
                };

                _this2.connection.onclose = function (reason, details) {
                    console.log('WAMP Connection closed', reason, details);
                    _this2.session = null;
                    reject(new Error('Connection problem: ' + reason));
                    document.dispatchEvent(new Event('asexor-client-close'));
                };
            });
            this.connection.open();
            return p;
        }
    }, {
        key: 'exec',
        value: function exec(task_name, args, kwargs) {
            if (!this.active) throw new Error('WAMP session is not active');
            try {
                return this.session.call(WAMP_REMOTE_PROCEDURE, [task_name].concat(args), kwargs);
            } catch (err) {
                return Promise.reject(err);
            }
        }
    }, {
        key: 'close',
        value: function close() {
            this.connection.close();
            this.session = null;
        }
    }, {
        key: 'active',
        get: function get() {
            return this.session;
        }
    }]);

    return Client;
}(_baseClient.BaseClient);