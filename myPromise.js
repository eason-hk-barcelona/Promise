class myPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.PromiseState = myPromise.PENDING;
    this.PromiseResult = null;
    this.onFulfilledCallbacks = []; //保存resolve的回调
    this.onRejectedCallbacks = []; //保存reject的回调

    // 判断生成实例的时候是否有报错
    try {
      executor(this.resolve.bind(this), this.reject.bind(this));
    } catch (error) {
      // 直接在构造函数里执行reject，不用bind，因为直接执行了，不是创建实例后才调用
      this.reject(error);
    }
  }

  resolve(result) {
    if (this.PromiseState === myPromise.PENDING) {
      this.PromiseState = myPromise.FULFILLED;
      this.PromiseResult = result;
      // 遍历队列执行回调
      this.onFulfilledCallbacks.forEach(callback => callback(result));
    }
  }
  reject(reason) {
    if (this.PromiseState === myPromise.PENDING) {
      this.PromiseState = myPromise.REJECTED;
      this.PromiseResult = reason;
      // 遍历队列执行回调
      this.onRejectedCallbacks.forEach(callback => callback(reason));
    }
  }

  // 使用原生微任务queueMicrotask
  then(onFulfilled, onRejected) {
    let promise2 = new myPromise((resolve, reject) => {
      if (this.PromiseState === myPromise.FULFILLED) {
        queueMicrotask(() => {
          try {
            if (typeof onFulfilled !== 'function') {  //2.2.7.3
              resolve(this.PromiseResult);
            } else {
              let x = onFulfilled(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject); //2.2.7.1
            }
          } catch (e) {  //2.2.7.2 
            reject(e);
          }
        });
      } else if (this.PromiseState === myPromise.REJECTED) {
        queueMicrotask(() => {
          try {
            if (typeof onRejected !== 'function') {
              reject(this.PromiseResult); //2.2.7.4
            } else {
              let x = onRejected(this.PromiseResult);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (e) {
            reject(e)
          }
        });
        // 状态为pending，则将成功或失败的回调函数进队列
      } else if (this.PromiseState === myPromise.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onFulfilled !== 'function') {
                resolve(this.PromiseResult);
              } else {
                let x = onFulfilled(this.PromiseResult);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onRejected !== 'function') {
                reject(this.PromiseResult);
              } else {
                let x = onRejected(this.PromiseResult);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    });

    return promise2;
  }
}


/**
* 对resolve()、reject() 进行改造增强 针对resolve()和reject()中不同值情况 进行处理
* @param  {promise} promise2 promise1.then方法返回的新的promise对象
* @param  {[type]} x         promise1中onFulfilled或onRejected的返回值
* @param  {[type]} resolve   promise2的resolve方法
* @param  {[type]} reject    promise2的reject方法
*/

function resolvePromise(promise2, x, resolve, reject) {
  // 2.3.1 x 与 promise 相等
  if (x === promise2) throw new TypeError('Chaining cycle detected for promise');
  // 2.3.2 如果 x 为 Promise 对象(继续执行x（啥也不干），若遇到y，则继续解析y)
  if (x instanceof myPromise) {
    x.then(y => {
      resolvePromise(promise2, y, resolve, reject);
    }, reject);
  } else if (x !== null && (typeof x === 'object' || (typeof x === 'function'))) {
    // 2.3.3 如果 x 为对象或函数（特判null，因为null也是'object'）———— thenable
    try {
      var then = x.then;  //2.3.3.1 变量提升
    } catch (e) {
      return reject(e);   //2.3.3.2 以 e 为据因拒绝 promise
    }
    //2.3.3.3 如果 then 是函数，将 x 作为函数的作用域 this 调用之
    if (typeof then === 'function') {
      // 优先采用首次调用并忽略剩下的调用
      let called = false;
      try {
        then.call(
          x,
          y => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        )
      } catch (e) { //调用 then 方法抛出了异常 e
        if (called) return;
        called = true;
        reject(e);
      }
    } else resolve(x);  //2.3.3.4 如果 then 不是函数，以 x 为参数执行 promise
  } else {
    // x 不为对象或者函数
    return resolve(x);
  }

}

myPromise.deferred = function () {
  let result = {};
  result.promise = new myPromise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;    //返回一个包含{ promise, resolve, reject }的对象
}

module.exports = myPromise;