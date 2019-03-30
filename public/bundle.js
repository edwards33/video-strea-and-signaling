(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const HexnutClient = require('hexnut-client');
const handle = require('hexnut-handle');

const client = new HexnutClient();

const sendJsonMiddleware = (ctx, next) => {
    if (ctx.isConnection) {
        ctx.sendJson = data => ctx.send(JSON.stringify(data));
    }
    return next();
};

const parseJsonMessages = (ctx, next) => {
    if (ctx.isMessage) {
        try {
            const parsed = JSON.parse(ctx.message);
            ctx.message = parsed;
        } catch (ex) {
            // Skip if messages can't be parsed
        }
    }
    return next();
};

client.use(sendJsonMiddleware);
client.use(parseJsonMessages);

window.connectToWSserver = function(msgType, room, cb){

    client.use(handle.connect(ctx => {
        ctx.sendJson({type: msgType, payload:{room, text:'test'}});
    }));

    client.use(handle.message(ctx => {
        console.log(`You send a MSG: ${ctx.message.payload.text}`);
        cb(ctx.message);
    }));

    client.connect('ws://localhost:3000');
};

window.sendMsgToWSserver  = function(room, msgObj){
    client.send(JSON.stringify({
        type: 'send',
        payload: {
            room,
            text: msgObj.text,
            author: msgObj.author
        }
    }));
}


},{"hexnut-client":3,"hexnut-handle":4}],2:[function(require,module,exports){
const ctx = {
  send(...args) {
    this.client.send(...args);
  },

  get isConnection() {
    return this.type === 'connection';
  },

  get isMessage() {
    return this.type === 'message';
  }
};

module.exports = (client, type, message) => Object.assign(Object.create(ctx), {
  client,
  type,
  message
});

},{}],3:[function(require,module,exports){
const createContext = require('./ctx');

class HexNutClient {
  constructor(wsConfig = {}) {
    this.config = {
      ...wsConfig
    };
    this.client = null;
    this.middleware = [];
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  onError(err, ctx) {
    if (typeof this.onerror === 'function') {
      this.onerror(err, ctx);
    }
  }

  connect(remoteAddress) {
    this.client = new WebSocket(remoteAddress);
    const ctx = createContext(this, 'connection');

    this.client.onopen = () => this.runMiddleware(ctx);
    this.client.onerror = err => this.onError(err, ctx);

    this.client.onmessage = msg => {
      ctx.message = msg.data;
      ctx.type = 'message';
      this.runMiddleware(ctx);
    };

    this.client.onclose = () => {
      ctx.message = undefined;
      ctx.type = 'close';
      this.runMiddleware(ctx);
    };
  }

  send(...args) {
    if (this.isReady()) {
      this.client.send(...args);
    }
    return this;
  }

  isReady() {
    return this.client && this.client.readyState === WebSocket.OPEN;
  }

  runMiddleware(ctx) {
    let i = 0;
    const run = async idx => {
      if (!ctx.isComplete && typeof this.middleware[idx] === 'function') {
        return await this.middleware[idx](ctx, () => run(idx+1));
      }
    };
    return run(i).catch(err => this.onError(err, ctx));
  }
};

module.exports = HexNutClient;
},{"./ctx":2}],4:[function(require,module,exports){
const connect = handler => (ctx, next) => {
  if (ctx.isConnection) {
    return handler(ctx, next);
  }
  return next();
};

const message = handler => (ctx, next) => {
  if (ctx.isMessage) {
    return handler(ctx, next);
  }
  return next();
};

const matchMessage = (handlerCheck, handler) => (ctx, next) => {
  if (typeof handlerCheck !== 'function') {
    throw new TypeError('Hexnut Handle Middleware: handlerCheck must be a function');
  }
  if (ctx.isMessage && handlerCheck(ctx.message)) {
    return handler(ctx, next);
  }
  return next();
};

const closing = handler => (ctx, next) => {
  if (ctx.isClosing) {
    return handler(ctx, next);
  }
  return next();
};

module.exports = {
  connect,
  message,
  matchMessage,
  closing
};

},{}]},{},[1]);
