'use strict';

const GrpcServer = require('../../lib/server');

const _grpcServer = Symbol.for('egg#grpcServer');

module.exports = {
  get GrpcServer() {
    if (!this[_grpcServer]) {
      this[_grpcServer] = GrpcServer;
    }
    return this[_grpcServer];
  },
};
