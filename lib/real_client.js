'use strict';

const Base = require('sdk-base');

/**
 * @class RealClient
 */
class RealClient extends Base {
  /**
   * @param {object} options - Registry Client参数
   * @constructor
   */
  constructor(options) {
    super({
      // 指定异步启动的方法
      initMethod: 'init',
    });
    this._options = options;
    this._registered = new Map();
  }

  /**
   * 启动逻辑
   * @return {void}
   */
  async init() {
    this.ready(true);
  }

  /**
   * 订阅
   * @param {Object} reg
   *   - {String} dataId - the dataId
   * @param {Function}  listener - the listener
   * @return {void}
   */
  subscribe(reg, listener) {
    const key = reg.dataId;
    // const data = reg.publishData;
    this.on(key, listener);
    // console.log('subscribe-server', reg)
    const data = this._registered.get(key);
    if (data) {
      process.nextTick(() => listener(data));
    }
  }

  /**
   * 发布
   * @param {Object} reg
   *   - {String} dataId - the dataId
   *   - {String} publishData - the publish data
   * @return {void}
   */
  publish(reg) {
    const key = reg.dataId;
    let changed = false;

    // console.log('publish-server', reg)
    if (this._registered.has(key)) {
      const arr = this._registered.get(key);
      if (arr.indexOf(reg.publishData) === -1) {
        changed = true;
        arr.push(reg.publishData);
      }
    } else {
      changed = true;
      this._registered.set(key, [ reg.publishData ]);
    }
    if (changed) {
      this.emit(key, this._registered.get(key).shift());
    }
  }
}

module.exports = RealClient;
