'use strict';

const grpc = require('grpc');
const path = require('path');
const is = require('is-type-of');
const assert = require('assert');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');

class GrpcServer {
  constructor(app) {
    this.app = app;
    this.options = Object.assign({
      port: 50051,
      timeOut: 5000,
      protoDir: 'app/proto',
      grpcDir: 'app/grpc',
      host: '127.0.0.1',
      loadOption: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    }, this.app.config.grpcServer);
    this.server = new grpc.Server();
    this.started = false;
    this.load();
  }

  // 获取Context
  ctx(server, implement) {
    const httpReq = {
      method: 'RPC',
      url: `/rpc/${server}/${implement}`,
      headers: {},
      socket: {},
    };
    return this.app.createContext(httpReq, new http.ServerResponse(httpReq));
  }

  close() {
    const _self = this;
    return new Promise(reslove => {
      try {
        _self.server.tryShutdown(() => {
          reslove();
        });
      } catch (err) {
        _self.logger.error(err);
        _self.server.forceShutdown;
        reslove();
      }
      this.app.logger.info(`[egg-grpc-server] close ${_self.options.host}:${_self.options.port}`);
    });
  }

  // 加载proto文件和implement文件至app
  load() {
    const { app } = this;
    const loadOpt = this.options.loadOption;
    const servicePaths = path.join(app.baseDir, this.options.grpcDir);
    const protoPaths = path.join(app.baseDir, this.options.protoDir);
    app.loader.loadToApp(servicePaths, '__grpc_server_services', {
      call: true,
      caseStyle: 'upper',
      override: true,
    });
    app.loader.loadToApp(protoPaths, '__grpc_proto_services', {
      call: true,
      caseStyle: 'upper',
      match: '**/*.proto',
      override: true,
      initializer(data, options) {
        return grpc.loadPackageDefinition(protoLoader.loadSync(options.path, loadOpt));
      },
    });
  }

  // 将proto的service和implement绑定，添加至grpc server
  addService() {
    const protoes = this.app.__grpc_proto_services;
    for (const key in protoes) {
      let service = protoes[key];
      // 用作import的proto文件
      if (JSON.stringify(service) === '{}') continue;
      while (is.object(service)) {
        const key = Object.keys(service)[0];
        if (is.function(service[key])) break;
        service = service[key];
      }
      for (const innerService in service) {
        this.server.addService(service[innerService].service, this.getImplementation(innerService, service[innerService].service));
      }
    }
  }

  // start grpc server
  start() {
    this.addService();
    this.server.bind(`${this.options.host}:${this.options.port}`, grpc.ServerCredentials.createInsecure());
    this.server.start();
    this.started = this.server.started;
    this.app.logger.info(`[egg-grpc-server] listen ${this.options.host}:${this.options.port}`);
  }

  // 根据proto文件的service查找对应implement
  getImplementation(serviceName, serviceObj) {
    const result = {};
    const _self = this;
    const delegate = this.app.__grpc_server_services[serviceName];
    const isClassDelegate = is.class(delegate);
    assert(delegate, `[egg-grpc-server] service ${delegate} not found`);
    Object.keys(serviceObj).forEach(s => {
      assert((delegate[s] && !isClassDelegate), `[egg-grpc-server] service ${serviceName}.${s} not found`);
    });
    for (const key of Object.keys(delegate)) {
      if (!serviceObj[key]) continue;
      result[key] = serviceObj[key].responseStream
        ? delegate[key].bind(this.ctx(serviceName, key))
        : async (call, callback) => {
          const { errorHandle } = _self.options;
          try {
            const ret = await delegate[key].call(_self.ctx(serviceName, key), call);
            callback(null, ret);
          } catch (err) {
            if (errorHandle) {
              const ret = errorHandle.call(_self.ctx(serviceName, key), err);
              if (ret) return callback(null, ret);
            }
            return callback(null, err);
          }
        };
    }
    return result;
  }
}

module.exports = GrpcServer;
