'use strict';

/**
 * egg-grpc-server default config
 * @member Config#grpcServer
 * @property {String} SOME_KEY - some description
 */
exports.grpcServer = {
  port: 50051,
  host: '127.0.0.1',
  timeOut: 5000,
  protoDir: 'app/proto',
  grpcDir: 'app/grpc',
  startAfterInit: false,
  loadOption: {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  },
  errorHandle(error) {
    this.logger.error(error);
    return { code: 500, message: 'error' };
  },
};
