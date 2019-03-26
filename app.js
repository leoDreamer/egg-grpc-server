'use strict';
const fs = require('fs');

module.exports = app => {
  app.beforeStart(() => {
    fs.writeFileSync('pid', process.pid);
  });
  app.ready(() => {
    if (app.config.startAfterInit) return;
    const pid = fs.readFileSync('pid', { encoding: 'utf8' });
    if (Number(pid) === process.pid) {
      const grpcServer = new app.GrpcServer(app);
      grpcServer.start();
      Reflect.defineProperty(app, 'grpcServer', { value: grpcServer });
    }
  });
  app.beforeClose(async () => {
    try {
      if (app.grpcServer) await app.grpcServer.close();
    } catch (err) {
      app.logger.error('[Close App Error]', err);
    }
  });
};
