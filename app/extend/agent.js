'use strict';

const RealClient = require('../../lib/real_client');
const _realClient = Symbol.for('egg#realClient');

module.exports = {
  get RealClient() {
    if (!this[_realClient]) {
      this[_realClient] = RealClient;
    }
    return this[_realClient];
  },
};
