'use strict';

exports.sayHello = async function(call) {
  const { request } = call;

  function sleep(time) {
    return new Promise(reslove => {
      setTimeout(() => {
        reslove();
      }, time);
    });
  }

  await sleep(1000);

  return {
    code: 200,
    message: 'hello ' + request.name + ', you are in ' + request.group,
  };
};

exports.buf = function(call) {

  call.on('data', data => {
    console.log('service recive data' + JSON.stringify(data));
    call.write('hello' + data.name);
  });
  call.on('end', () => {
    call.end();
  });
};
