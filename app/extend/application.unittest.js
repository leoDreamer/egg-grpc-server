'use strict';

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const is = require('is-type-of');

module.exports = {
  grpcServerTest(option) {
    let service = grpc.loadPackageDefinition(protoLoader.loadSync(option.proto));
    while (is.object(service)) {
      const key = Object.keys(service)[0];
      if (is.function(service[key])) break;
      service = service[key];
    }
    const serviceName = [];
    for (const key in service) {
      serviceName.push(key);
    }
    const client = new service[option.service || serviceName[0]](`127.0.0.1:${this.config.grpcServer.port}`, grpc.credentials.createInsecure());
    return client[option.implement].responseStream
      ? client[option.implement]()
      : new Promise((resolve, reject) => {
        client[option.implement](option.data, (error, response) => {
          if (error) { reject(error); }
          resolve(response);
        });
      });
  },
};
