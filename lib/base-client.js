'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RemoteError = exports.RemoteError = function (_Error) {
  _inherits(RemoteError, _Error);

  function RemoteError(message, remoteStackTrace) {
    _classCallCheck(this, RemoteError);

    var _this = _possibleConstructorReturn(this, (RemoteError.__proto__ || Object.getPrototypeOf(RemoteError)).call(this, message));

    _this.message = message;
    _this.remoteStackTrace = remoteStackTrace;
    return _this;
  }

  _createClass(RemoteError, [{
    key: 'toString',
    value: function toString() {
      var msg = 'Remote Error: ' + this.message;
      if (this.remoteStackTrace) msg = msg + ('\n' + this.remoteStackTrace);
      return msg;
    }
  }]);

  return RemoteError;
}(Error);

;

var BaseClient = exports.BaseClient = function () {
  function BaseClient() {
    _classCallCheck(this, BaseClient);

    if (new.target === BaseClient) throw new TypeError('Cannot instantiate abstract class');
    this.listeners = new Set();
  }

  _createClass(BaseClient, [{
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
    key: 'updateListeners',
    value: function updateListeners(taskId, data) {
      this.listeners.forEach(function (handler) {
        return handler(taskId, data);
      });
    }

    // abstact

  }, {
    key: 'connect',
    value: function connect() {
      throw new TypeError('Must override this method');
    }

    // abstract

  }, {
    key: 'exec',
    value: function exec(task_name, args, kwargs) {
      throw new TypeError('Must override this method');
    }

    // abstract

  }, {
    key: 'close',
    value: function close() {
      throw new TypeError('Must override this method');
    }

    // abstract

  }, {
    key: 'active',
    get: function get() {
      throw new TypeError('Must override this method');
    }
  }]);

  return BaseClient;
}();