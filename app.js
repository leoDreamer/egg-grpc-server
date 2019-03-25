'use strict';
const fs = require('fs');

module.exports = app => {
  if (app.config.startAfterInit) return;
  app.beforeStart(() => {
    fs.writeFileSync('pid', process.pid);
  });
  app.ready(() => {
    const pid = fs.readFileSync('pid', { encoding: 'utf8' });
    if (Number(pid) === process.pid) {
      const grpcServer = new app.GrpcServer(app);
      grpcServer.start();
      Reflect.defineProperty(app, 'grpcServer', { value: grpcServer });
    }
  });
};
