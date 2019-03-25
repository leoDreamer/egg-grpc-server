# egg-grpc-server

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-grpc-server.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-grpc-server
[travis-image]: https://img.shields.io/travis/eggjs/egg-grpc-server.svg?style=flat-square
[travis-url]: https://travis-ci.org/eggjs/egg-grpc-server
[codecov-image]: https://img.shields.io/codecov/c/github/eggjs/egg-grpc-server.svg?style=flat-square
[codecov-url]: https://codecov.io/github/eggjs/egg-grpc-server?branch=master
[david-image]: https://img.shields.io/david/eggjs/egg-grpc-server.svg?style=flat-square
[david-url]: https://david-dm.org/eggjs/egg-grpc-server
[snyk-image]: https://snyk.io/test/npm/egg-grpc-server/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-grpc-server
[download-image]: https://img.shields.io/npm/dm/egg-grpc-server.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-grpc-server

<!--
eggjs 的 grpc 插件，目前还不支持流式请求和响应，后续支持,写得比较简单。
-->

## Install

<!-- $ npm i egg-grpc-server --save -->
```bash
npm install egg-plugin-grpc-server --save
```

## Usage

```js
// {app_root}/config/plugin.js
exports.grpcServer = {
  enable: true,
  package: 'egg-plugin-grpc-server',
};
```

## Configuration

```js
// {app_root}/config/config.default.js
exports.grpcServer = {
  port: 50051,             // grpc监听端口
  host: '127.0.0.1',       // 监听地址
  timeOut: 5000,           // 超时时间
  protoDir: 'app/proto',  // proto文件所在文件夹
  grpcDir: 'app/grpc'     // 接口实现所在文件夹
  errorHandle(error) {     // 全局统一错误处理
    // TODO
    // this 为ctx，接受error参数
  }
};
```

see [config/config.default.js](config/config.default.js) for more detail.

## Example

### 启动

+ 插件在app上挂载了GrpcServer的class，需要在项目启动时实例化并调用start方法
+ 启动方式一：直接在app.js实例化并启动**不推荐(在多进程模式下会报错)**
```javascript
// ${app_root}/app.js
module.exports = app => {
  const grpcServer = new app.GrpcServer(app);
  grpcServer.start();
  Reflect.defineProperty(app, 'grpcServer', { value: grpcServer });
};
```
+ 启动方式二：使用cluster-client管理启动
  + agent上创建leader，管理work中server实例
```javascript
// ${app_root}/app.js
module.exports = app => {
  const registryClient = app.cluster(app.RealClient, { isBroadcast: false }).create({})

  app.beforeStart(async () => {
    // worker 订阅启动grpc 服务消息
    registryClient.subscribe({
      dataId: 'grpc.server.leader.attach'
    }, val => {
      app.logger.info(`worker subscribe [grpc.server.leader.attach]: ${val}`)
      if (val === process.pid) {
        const grpcServer = new app.GrpcServer(app)
        grpcServer.start()
        Reflect.defineProperty(app, 'grpcServer', { value: grpcServer })
        // 向leader发送start消息
        registryClient.publish({
          dataId: 'grpc.server.worker.start',
          publishData: process.pid
        })
      }
    })

    // 向leader发送ready消息
    registryClient.publish({
      dataId: 'grpc.server.worker.ready',
      publishData: process.pid
    })
  })

  // 退出时关闭 grpc server 并 像 leader 发送 close 信号
  app.beforeClose(async () => {
    await app.grpcServer.close()
    // 向leader发送ready消息
    registryClient.publish({
      dataId: 'grpc.server.worker.close',
      publishData: process.pid
    })
  })

  process.on('disconnect', async () => {
    await app.grpcServer.close()
    registryClient.publish({
      dataId: 'grpc.server.worker.close',
      publishData: process.pid
    })
  })

  process.on('uncaughtException', async err => {
    await app.grpcServer.close()
    registryClient.publish({
      dataId: 'grpc.server.worker.close',
      publishData: process.pid
    })
    app.logger.error(err)
  })
}
```
```javascript
// ${app_root}/agent.js
module.exports = agent => {
  const registryClient = agent.cluster(agent.RealClient, { isBroadcast: false }).create({})

  agent.beforeStart(async () => {
    await registryClient.ready()
    const works = new Map()

    // 订阅 worker ready消息，并记录
    registryClient.subscribe({
      dataId: 'grpc.server.worker.ready'
    }, val => {
      agent.logger.info(`leader subscribe [grpc.server.worker.ready]: ${val}`)
      works.set(val, false)
      let isStarted = false
      works.forEach((value, key) => {
        if (value) isStarted = true
      })
      if (!isStarted) {
        registryClient.publish({
          dataId: 'grpc.server.leader.attach',
          publishData: [...works.keys()][0]
        })
      }
    })

    // 订阅 worker grpc server启动消息
    registryClient.subscribe({
      dataId: 'grpc.server.worker.start'
    }, val => {
      agent.logger.info(`leader subscribe [grpc.server.worker.start]: ${val}`)
      works.set(val, true)
    })

    // 订阅worker关闭消息
    registryClient.subscribe({
      dataId: 'grpc.server.worker.close'
    }, val => {
      agent.logger.info(`leader subscribe [grpc.server.worker.close]: ${val}`)
      agent.logger.info(`leader current works: ${works}`)
      works.delete(val)
      registryClient.publish({
        dataId: 'grpc.server.leader.attach',
        publishData: [...works.keys()][0]
      })
    })
  })

  process.on('uncaughtException', err => {
    agent.logger.error(err)
  })
}

```

+ proto/xxx.proto service中的的接口名 grpc/xxx.js 中的接口名 二者应当同名(grpc/xxx.js文件名可不大写)

### proto 文件，可通过`config.dir`配置目录，默认`app/proto`

+ [Protocol Buffers Docs](https://developers.google.com/protocol-buffers/docs/overview)

```js

// {app_root}/app/protos/hello.proto
syntax = "proto3";

package egg.node;

service Hello {
    rpc sayHello (HelloReq) returns (HelloResp) {};
    rpc buf (stream BufRequest) returns (stream BufResp) {};
}

message HelloReq {
    string name = 1;
    int32 group = 2;
}

message HelloResp {
    int32 code = 1;
    string message = 2;
}

message BufRequest {
    string name = 1;
}

message BufResp {
    string message = 1;
    int32 code = 2;
}

```

### 接口实现，`this`为`egg`的`Context`，接受一个参数为请求的`call`(grpc中的call，`call.request`为请求参数)

```js

// {app_root}/app/grpc/hello.js
'use strict';

exports.sayHello = async function(call) {
  const { request } = call;

  function sleep(time) {
    return new Promise(reslove => {
      setTimeout(() => {
        reslove();
      }, time);
    });
  }

  await sleep(1000);

  return {
    code: 200,
    message: 'hello ' + request.name + ', you are in ' + request.group,
  };
};

exports.buf = function(call) {

  call.on('data', data => {
    console.log('service recive data' + JSON.stringify(data));
    call.write('hello' + data.name);
  });
  call.on('end', () => {
    call.end();
  });
};

```

### 单元测试

+ 在`unittest`环境中app挂载了`grpcServerTest`方法用于测试
```javascript
const { assert, app } = require('egg-mock/bootstrap');
const path = require('path');
const PROTO_PATH_HELLO = path.join(__dirname, '../app/proto/hello.proto');
const grpc = require('grpc');
describe('test/grpc-server.test.js', () => {
  let test;
  before(async () => {
    await app.ready();
    test = app.grpcServerTest
  });
  it('should visit hello by grpcServer.hello', async () => {
    const res = await test.call(app, {
      proto: PROTO_PATH_HELLO,
      implement: 'sayHello',
      service: 'Hello', // 默认第一个service
      data: { name: 'leo', group: 1 },
    });
    assert(res.code === 200);
  });
  it('should visit by stream test', () => {
    const call = test.call(app, {
      proto: PROTO_PATH_HELLO,
      implement: 'buf',
    });
    call.write({ name: 'leo' });
    call.end();
    call.on('data', function(data) {
      console.log('buf-resp-data', data);
    });
    call.on('end', function() {
      // TODO
    });
  });
  
```

<!-- example here -->

## Questions & Suggestions

Please open an issue [here](https://github.com/leoDreamer/egg-grpc-server/issues).

## License

[MIT](LICENSE)
