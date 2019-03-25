'use strict';

const mm = require('egg-mock');
const assert = require('assert');
const path = require('path');
const PROTO_PATH_HELLO = path.join(__dirname, 'fixtures/server/app/proto/hello.proto');
const PROTO_PATH_HEALTH = path.join(__dirname, 'fixtures/server/app/proto/health.proto');
const grpc = require('grpc');

describe('test/grpc-server.test.js', () => {
  let test;
  let app;
  before(async () => {
    app = mm.app({ baseDir: 'server' });
    await app.ready();
    test = app.grpcServerTest;
  });

  xit('should visit by grpc client', async () => {
    const routeguide = grpc.load(PROTO_PATH_HELLO).egg.node;
    const client = new routeguide.Hello('127.0.0.1:50051', grpc.credentials.createInsecure());
    function clientgetProfile(options) {
      return new Promise((resolve, reject) => {
        client.sayHello(options, (error, response) => {
          if (error) { reject(error); }
          resolve(response);
        });
      });
    }
    const res = await clientgetProfile({ name: 'leo', group: 1 });
    assert(res.code === 200);
  });

  it('should visit by metadata test', async () => {
    const res = await test.call(app, {
      proto: PROTO_PATH_HELLO,
      implement: 'sayHello',
      data: { name: 'leo', group: 1 },
    });
    assert(res.code === 200);
  });

  it('health check', async () => {
    const res = await test.call(app, {
      proto: PROTO_PATH_HEALTH,
      implement: 'Check',
      data: { service: '1' },
    });
    assert(res.status === 1);
  });

  it('should visit by stream', async () => {
    const routeguide = grpc.load(PROTO_PATH_HELLO).egg.node;
    const client = new routeguide.Hello('127.0.0.1:50051', grpc.credentials.createInsecure());
    const call = client.buf();

    call.write('leo');
    call.end();
    call.on('data', function(data) {
      console.log('buf-resp-data', data);
    });
    call.on('end', function(b) {
      console.log('end', b);
    });
  });

  xit('should visit by stream test', () => {
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
});
