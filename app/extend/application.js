'use strict';

const GrpcServer = require('../../lib/server');
const RealClient = require('../../lib/real_client');

const _grpcServer = Symbol.for('egg#grpcServer');
const _realClient = Symbol.for('egg#realClient');

module.exports = {
  get GrpcServer() {
    if (!this[_grpcServer]) {
      this[_grpcServer] = GrpcServer;
    }
    return this[_grpcServer];
  },
  get RealClient() {
    if (!this[_realClient]) {
      this[_realClient] = RealClient;
    }
    return this[_realClient];
  },
};
