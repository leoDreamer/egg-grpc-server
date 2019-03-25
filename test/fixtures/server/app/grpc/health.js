'use strict';

async function Check() {
  // TODO health check
  return { status: 'SERVING' };
}

module.exports = { Check };
