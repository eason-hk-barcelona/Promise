## Promise方法

### 是什么：

1. 本质上 Promise 是一个函数（必须给promise对象传入一个执行函数，不然报错）返回的对象，优势在不需要把整个回调函数作为参数传入另一个回调函数（回调地狱，可读性差），Promise是一个带有then方法的对象，then方法执行的同时也会返回一个新的Promise对象

​	写法：扁平化和嵌套，一般建议扁平化（不容易错）

````js
doSomething()
  .then(function (result) {
    // 如果使用完整的函数表达式：返回 Promise
    return doSomethingElse(result);
  })
  // 如果使用箭头函数：省略大括号并隐式返回结果
  .then((newResult) => doThirdThing(newResult))
  // 即便上一个 Promise 返回了一个结果，后一个 Promise 也不一定非要使用它。
  // 你可以传入一个不使用前一个结果的处理程序。
  .then((/* 忽略上一个结果 */) => doFourthThing())
  // 总是使用 catch 终止 Promise 链，以保证任何未处理的拒绝事件都能被捕获！
  .catch((error) => console.error(error));
````

​	注意：`() => x` 是 `() => { return x; }` 的简写。

2. 关于constructor：

````js
let promise = new Promise(function(resolve, reject) {
  // executor（生产者代码，“歌手”）
});
````

promise被创建时，executor会自动运行，它的参数 `resolve` 和 `reject` 是由 JavaScript 自身提供的回调。我们的代码仅在 	executor 的内部。executor结果两种：

- `resolve(value)` —— 如果任务成功完成并带有结果 `value`。
- `reject(error)` —— 如果出现了 error，`error` 即为 error 对象。

假如你new了一个Promise对象，constructor返回的对象有如下内部属性：

- `state` —— 最初是 `"pending"`，然后在 `resolve` 被调用时变为 `"fulfilled"`，或者在 `reject` 被调用时变为 `"rejected"`。
- `result` —— 最初是 `undefined`，然后在 `resolve(value)` 被调用时变为 `value`，或者在 `reject(error)` 被调用时变为 `error`。

3. `.catch(f)` 调用是 `.then(null, f)` 的完全的模拟，它只是一个简写形式

4. `.finally(f)` 类似于 （但不等同）`.then(f, f)`，因为当 promise settled 时 `f` 就会执行：无论 promise 被 resolve 还是 reject

   二者的区别：

   * finally处理程序没有参数
   * `finally` 处理程序没有得到前一个处理程序的结果（它没有参数）。而这个结果被传递给了下一个合适的处理程序。
   * finally返回的内容会被忽略
   * 当 `finally` 抛出 error 时，执行将转到最近的 error 的处理程序

### 如何实现：

1. `[[Resolve]](promise, x)` 是一个术语，描述了 Promise 规范中用于处理 Promise 对象状态变化的内部操作。

   在 Promise 的规范中，`[[Resolve]]` 是一个抽象操作，它描述了根据给定值 `x`（可能是一个普通值，也可能是另一个 Promise）来改变给定的 `promise` 的状态。这个 `[[Resolve]]` 操作根据 `x` 的值和类型执行不同的行为，遵循以下规则：

   1. 如果 `x` 是一个 Promise 对象，则 `promise` 将采用 `x` 的状态。
   2. 如果 `x` 是一个对象或函数，尝试获取 `then` 方法。如果获取 `then` 方法出错，用错误信息拒绝 `promise`。
   3. 如果 `x` 具有 `then` 方法，将 `promise` 的状态根据 `then` 方法的调用结果进行改变。这意味着将 `x` 的状态传递给 `promise`。
   4. 如果 `x` 是一个普通值（非 Promise），用该值解决 `promise`。

   总体而言，`[[Resolve]](promise, x)` 是规范中的内部操作，用于将 Promise 对象的状态与给定值 `x` 关联起来。这是 Promise 规范中定义的处理 Promise 状态改变的内部步骤之一。