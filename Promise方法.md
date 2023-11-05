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

3. `catch()` 方法返回一个`Promise`，并且处理拒绝的情况。它的行为与调用`Promise.prototype.then(undefined, onRejected)` 相同。

4. `.finally(f)` 类似于 （但不等同）`.then(f, f)`，因为当 promise settled 时 `f` 就会执行：无论 promise 被 resolve 还是 reject

   二者的区别：

   * finally处理程序没有参数
   * `finally` 处理程序没有得到前一个处理程序的结果（它没有参数）。而这个结果被传递给了下一个合适的处理程序。
   * finally返回的内容会被忽略
   * 当 `finally` 抛出 error 时，执行将转到最近的 error 的处理程序

### 关于约束

* promise只以第一次为准，后面状态不再更改
* `resolve()`、`reject()`以及`throw`的话，状态永远是pending
* 规定必须给`Promise`对象传入一个执行函数（executor），否则将会报错
* 如果 `onFulfilled` 和 `onRejected` 不是函数，就忽略他们（其实就是2.2.7.3和2.2.7.4）

#### Promises/A+ 规范的理解

* **2.2.7.1** 如果 `onFulfilled` 或者 `onRejected` 返回一个值 `x` ，则运行下面的 **Promise 解决过程：`[[Resolve]](promise2, x)`**
* **2.2.7.2** 如果 `onFulfilled` 或者 `onRejected` 抛出一个异常 `e` ，则 `promise2` 必须拒绝执行，并返回拒因 `e`
* **2.2.7.3** 如果 `onFulfilled` 不是函数且 `promise1` 成功执行， `promise2` 必须成功执行并返回相同的值
* **2.2.7.4** 如果 `onRejected` 不是函数且 `promise1` 拒绝执行， `promise2` 必须拒绝执行并返回相同的据因

##### 对2.2.7.1

* `resolve()`和`reject()` 返回的 `x` 值的几种情况：
  1. 普通值
  2. Promise对象
  3. thenable对象/函数

##### 对2.3.3 `x`为对象或函数

如果 x 为对象或者函数：

- 2.3.3.1 把 `x.then` 赋值给 `then`
- 2.3.3.2 如果取 `x.then` 的值时抛出错误 `e` ，则以 `e` 为据因拒绝 `promise`
- 2.3.3.3 如果 `then` 是函数，将 `x` 作为函数的作用域 `this` 调用之。传递两个回调函数作为参数，第一个参数叫做 `resolvePromise` ，第二个参数叫做 `rejectPromise`:
  - 2.3.3.3.1 如果 `resolvePromise` 以值 `y` 为参数被调用，则运行 `[[Resolve]](promise, y)`
  - 2.3.3.3.2 如果 `rejectPromise` 以据因 `r` 为参数被调用，则以据因 `r` 拒绝 `promise`
  - 2.3.3.3.3 如果 `resolvePromise` 和 `rejectPromise` 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
  - 2.3.3.3.4 如果调用 `then` 方法抛出了异常 `e`：
    - 2.3.3.3.4.1 如果 `resolvePromise` 或 `rejectPromise` 已经被调用，则忽略之
    - 2.3.3.3.4.2 否则以 `e` 为据因拒绝 `promise`
  - 2.3.3.4 如果 `then` 不是函数，以 `x` 为参数执行 `promise`

### 如何实现：

1. 使用`this.PromiseResult = null;` 给空值`null`是因为执行`resolve()`或者`reject()`的时候会给结果赋值

2. 如果不用`this.resolve(reject).bind(this)`，那么new实例会出现`Uncaught TypeError: Cannot read property 'PromiseState ' of undefined`，说明this跟丢了，因为我们是在==新实例被创建后==再在==外部环境下==执行`resolve()`方法的，这里的`resolve()`看着像是和实例一起执行的，其实不然，也就**相当于不在`class`内部使用这个`this`**，bind的意思就是给当前实例的resolve绑定this为实例对象，并且执行`this.resolve()`方法

   * 小tips：**一个函数被 `call/apply` 的时候，会立即执行函数，但是 `bind` 会创建一个新函数，不会立即执行。**

3. ````js
    try {
       throw new Error('test');
     } catch(e) {
       reject(e);
     }
   ````

   `e`代表的是捕获到错误的对象，这里写法等同于**throw** **new** **Error**('test'); 其中错误对象常用属性有.name表示错误名，.message表示错误消息

4. 有一个很多人忽略的小细节，**要确保 onFulfilled 和 onRejected 方法异步执行，且应该在 then 方法被调用的那一轮事件循环之后的新执行栈中执行**。因此，**在保存成功和失败回调时也要添加微任务queueMicrotask**

5. `[[Resolve]](promise, x)` 是一个术语，描述了 Promise 规范中用于处理 Promise 对象状态变化的内部操作。

   在 Promise 的规范中，`[[Resolve]]` 是一个抽象操作，它描述了根据给定值 `x`（可能是一个普通值，也可能是另一个 Promise）来改变给定的 `promise` 的状态。这个 `[[Resolve]]` 操作根据 `x` 的值和类型执行不同的行为，遵循以下规则：

   1. 如果 `x` 是一个 Promise 对象，则 `promise` 将采用 `x` 的状态。
   2. 如果 `x` 是一个对象或函数，尝试获取 `then` 方法。如果获取 `then` 方法出错，用错误信息拒绝 `promise`。
   3. 如果 `x` 具有 `then` 方法，将 `promise` 的状态根据 `then` 方法的调用结果进行改变。这意味着将 `x` 的状态传递给 `promise`。
   4. 如果 `x` 是一个普通值（非 Promise），用该值解决 `promise`。

   总体而言，`[[Resolve]](promise, x)` 是规范中的内部操作，用于将 Promise 对象的状态与给定值 `x` 关联起来。这是 Promise 规范中定义的处理 Promise 状态改变的内部步骤之一。

6. 使用`var then = x.then`：

   JavaScript 中的变量提升是指在代码解析阶段，变量声明会被提升到当前作用域的顶部，但是初始化部分并不会提升。所以在这种情况下，`var then;` 会被提升到作用域顶部，但它的值并不会被提升，仅在 `try` 代码块中进行初始化。

   作用：下面对then分类讨论时不会没有初始化（用let作用域只在try/catch）

### `async和await`

async 函数返回一个 Promise 对象，可以使用 then 方法添加回调函数

async 函数中可能会有 await 表达式，async 函数执行时，如果遇到 await 就会先暂停执行 ，等到触发的异步操作完成后，恢复 async 函数的执行并返回解析值（await 关键字仅在 async function 中有效）

正常情况下，await 命令后面是一个 Promise 对象，它也可以跟其他值，如字符串，布尔值，数值以及普通函数

await针对所跟不同表达式的处理方式：

- Promise 对象：await 会暂停执行，等待 Promise 对象 resolve，然后恢复 async 函数的执行并返回解析值。
- 非 Promise 对象：直接返回对应的值。