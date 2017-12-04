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

var COOKIE_NAME = 'ASEXOR_LP_SESSION';

function checkResponse(response) {
  if (!response.ok) throw new Error('Response status: ' + response.status);
  return response.json();
}

var Client = exports.Client = function (_BaseClient) {
  _inherits(Client, _BaseClient);

  function Client(url, token) {
    _classCallCheck(this, Client);

    var _this = _possibleConstructorReturn(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this));

    _this.url = url;
    _this.token = token;
    _this._connected = false;
    _this._call_id = 1;
    return _this;
  }

  _createClass(Client, [{
    key: 'connect',
    value: function connect() {
      var _this2 = this;

      return fetch(this.url, { 'headers': { 'Authorization': 'Bearer ' + this.token },
        'credentials': 'include' }).then(checkResponse).then(function (data) {
        document.dispatchEvent(new Event('asexor-client-open'));
        console.log('Client connected');
        _this2._connected = true;

        var poll = function poll() {
          if (_this2._connected) {
            fetch(_this2.url, { 'credentials': 'include' }).then(checkResponse).then(function (data) {
              if (_this2._connected) {
                _this2.processUpdates(data);
                window.setTimeout(poll, 0);
              }
            }).catch(function (err) {
              console.error('Long poll error ' + err);
              _this2._connected = false;
            });
          }
        };

        poll();
      });
    }
  }, {
    key: 'processUpdates',
    value: function processUpdates(data) {
      var _this3 = this;

      if (Array.isArray(data)) {
        data.forEach(function (msg) {
          var _msg = _slicedToArray(msg, 3),
              call_id = _msg[0],
              type = _msg[1],
              payload = _msg[2];

          var taskId = payload.task_id;
          if (!taskId) {
            console.error('Invalid update message - task_id missing');
          } else {
            delete payload.task_id;
            _this3.updateListeners(taskId, payload);
          }
        });
      }
    }
  }, {
    key: 'exec',
    value: function exec(task_name, args, kwargs) {

      var call_id = this.next_call_id;
      return fetch(this.url, { 'method': 'POST',
        'credentials': 'include',
        'headers': { 'Content-Type': 'application/json' },
        'body': JSON.stringify([call_id, task_name, { args: args, kwargs: kwargs }])
      }).then(checkResponse).then(function (msg) {
        var _msg2 = _slicedToArray(msg, 4),
            msg_type = _msg2[0],
            call_id = _msg2[1],
            payload = _msg2[2],
            extra = _msg2[3];

        if (msg_type === 'r') {
          return payload;
        } else if (msg_type === 'e') {
          throw new _baseClient.RemoteError(payload, extra);
        } else {
          console.error('Invalid response');
        }
      });
    }
  }, {
    key: 'close',
    value: function close() {
      this._connected = false;
      document.dispatchEvent(new Event('asexor-client-close'));
    }
  }, {
    key: 'active',
    get: function get() {
      return this._connected;
    }
  }]);

  return Client;
}(_baseClient.BaseClient);