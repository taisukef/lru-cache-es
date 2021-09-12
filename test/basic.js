import * as t from "https://deno.land/std/testing/asserts.ts";
import { LRUCache } from "../LRUCache.js";
import { sleep } from "https://js.sabae.cc/sleep.js";

Deno.test('basic', function () {
  var cache = new LRUCache({ max: 10 })
  cache.set('key', 'value')
  t.assertEquals(cache.get('key'), 'value')
  t.assertEquals(cache.get('nada'), undefined)
  t.assertEquals(cache.length, 1)
  t.assertEquals(cache.max, 10)
  //t.end()
})
Deno.test('least recently set', function () {
  var cache = new LRUCache(2)
  cache.set('a', 'A')
  cache.set('b', 'B')
  cache.set('c', 'C')
  t.assertEquals(cache.get('c'), 'C')
  t.assertEquals(cache.get('b'), 'B')
  t.assertEquals(cache.get('a'), undefined)
  //t.end()
})

Deno.test('LRUCache recently gotten', function () {
  var cache = new LRUCache(2)
  cache.set('a', 'A')
  cache.set('b', 'B')
  cache.get('a')
  cache.set('c', 'C')
  t.assertEquals(cache.get('c'), 'C')
  t.assertEquals(cache.get('b'), undefined)
  t.assertEquals(cache.get('a'), 'A')
  //t.end()
})

Deno.test('del', function () {
  var cache = new LRUCache(2)
  cache.set('a', 'A')
  cache.del('a')
  t.assertEquals(cache.get('a'), undefined)
  //t.end()
})

Deno.test('max', function () {
  var cache = new LRUCache(3)

  // test changing the max, verify that the LRUCache items get dropped.
  cache.max = 100
  var i
  for (i = 0; i < 100; i++) cache.set(i, i)
  t.assertEquals(cache.length, 100)
  for (i = 0; i < 100; i++) {
    t.assertEquals(cache.get(i), i)
  }
  cache.max = 3
  t.assertEquals(cache.length, 3)
  for (i = 0; i < 97; i++) {
    t.assertEquals(cache.get(i), undefined)
  }
  for (i = 98; i < 100; i++) {
    t.assertEquals(cache.get(i), i)
  }

  // now remove the max restriction, and try again.
  cache.max = 0
  for (i = 0; i < 100; i++) cache.set(i, i)
  t.assertEquals(cache.length, 100)
  for (i = 0; i < 100; i++) {
    t.assertEquals(cache.get(i), i)
  }
  // should trigger an immediate resize
  cache.max = 3
  t.assertEquals(cache.length, 3)
  for (i = 0; i < 97; i++) {
    t.assertEquals(cache.get(i), undefined)
  }
  for (i = 98; i < 100; i++) {
    t.assertEquals(cache.get(i), i)
  }
  //t.end()
})

Deno.test('reset', function () {
  var cache = new LRUCache(10)
  cache.set('a', 'A')
  cache.set('b', 'B')
  cache.reset()
  t.assertEquals(cache.length, 0)
  t.assertEquals(cache.max, 10)
  t.assertEquals(cache.get('a'), undefined)
  t.assertEquals(cache.get('b'), undefined)
  //t.end()
})

Deno.test('basic with weighed length', function () {
  var cache = new LRUCache({
    max: 100,
    length: function (item, key) {
      t.assert(typeof key == "string");
      //t_isa(key, 'string')
      return item.size
    }
  })
  cache.set('key', { val: 'value', size: 50 })
  t.assertEquals(cache.get('key').val, 'value')
  t.assertEquals(cache.get('nada'), undefined)
  t.assertEquals(cache.lengthCalculator(cache.get('key'), 'key'), 50)
  t.assertEquals(cache.length, 50)
  t.assertEquals(cache.max, 100)
  //t.end()
})

Deno.test('weighed length item too large', function () {
  var cache = new LRUCache({
    max: 10,
    length: function (item) { return item.size }
  })
  t.assertEquals(cache.max, 10)

  // should fall out immediately
  cache.set('key', { val: 'value', size: 50 })

  t.assertEquals(cache.length, 0)
  t.assertEquals(cache.get('key'), undefined)
  //t.end()
})

Deno.test('least recently set with weighed length', function () {
  var cache = new LRUCache({
    max: 8,
    length: function (item) { return item.length }
  })
  cache.set('a', 'A')
  cache.set('b', 'BB')
  cache.set('c', 'CCC')
  cache.set('d', 'DDDD')
  t.assertEquals(cache.get('d'), 'DDDD')
  t.assertEquals(cache.get('c'), 'CCC')
  t.assertEquals(cache.get('b'), undefined)
  t.assertEquals(cache.get('a'), undefined)
  //t.end()
})

Deno.test('LRUCache recently gotten with weighed length', function () {
  var cache = new LRUCache({
    max: 8,
    length: function (item) { return item.length }
  })
  cache.set('a', 'A')
  cache.set('b', 'BB')
  cache.set('c', 'CCC')
  cache.get('a')
  cache.get('b')
  cache.set('d', 'DDDD')
  t.assertEquals(cache.get('c'), undefined)
  t.assertEquals(cache.get('d'), 'DDDD')
  t.assertEquals(cache.get('b'), 'BB')
  t.assertEquals(cache.get('a'), 'A')
  //t.end()
})

Deno.test('LRUCache recently updated with weighed length', function () {
  var cache = new LRUCache({
    max: 8,
    length: function (item) { return item.length }
  })
  cache.set('a', 'A')
  cache.set('b', 'BB')
  cache.set('c', 'CCC')
  t.assertEquals(cache.length, 6) // CCC BB A
  cache.set('a', '+A')
  t.assertEquals(cache.length, 7) // +A CCC BB
  cache.set('b', '++BB')
  t.assertEquals(cache.length, 6) // ++BB +A
  t.assertEquals(cache.get('c'), undefined)

  cache.set('c', 'oversized')
  t.assertEquals(cache.length, 6) // ++BB +A
  t.assertEquals(cache.get('c'), undefined)

  cache.set('a', 'oversized')
  t.assertEquals(cache.length, 4) // ++BB
  t.assertEquals(cache.get('a'), undefined)
  t.assertEquals(cache.get('b'), '++BB')
  //t.end()
})

Deno.test('set returns proper booleans', function () {
  var cache = new LRUCache({
    max: 5,
    length: function (item) { return item.length }
  })

  t.assertEquals(cache.set('a', 'A'), true)

  // should return false for max exceeded
  t.assertEquals(cache.set('b', 'donuts'), false)

  t.assertEquals(cache.set('b', 'B'), true)
  t.assertEquals(cache.set('c', 'CCCC'), true)
  //t.end()
})

Deno.test('drop the old items', async function () {
  //var n = process.env.CI ? 1000 : 100
  var n = 100;
  var cache = new LRUCache({
    max: 5,
    maxAge: n * 2
  })

  cache.set('a', 'A')

  setTimeout(function () {
    cache.set('b', 'b')
    t.assertEquals(cache.get('a'), 'A')
  }, n)

  setTimeout(function () {
    cache.set('c', 'C')
    // timed out
    t.assert(!cache.get('a'))
  }, n * 3)

  setTimeout(function () {
    t.assert(!cache.get('b'))
    t.assertEquals(cache.get('c'), 'C')
  }, n * 4)

  setTimeout(function () {
    t.assert(!cache.get('c'))
    //t.end()
  }, n * 6)

  await sleep(n * 20);
})

Deno.test('manual pruning', async function () {
  var cache = new LRUCache({
    max: 5,
    maxAge: 50
  })

  cache.set('a', 'A')
  cache.set('b', 'b')
  cache.set('c', 'C')

  setTimeout(function () {
    cache.prune()

    t.assert(!cache.get('a'))
    t.assert(!cache.get('b'))
    t.assert(!cache.get('c'))

    //t.end()
  }, 100)

  await sleep(200);
})

Deno.test('individual item can have its own maxAge', async function () {
  var cache = new LRUCache({
    max: 5,
    maxAge: 50
  })

  cache.set('a', 'A', 20)
  setTimeout(function () {
    t.assert(!cache.get('a'))
    //t.end()
  }, 25)

  await sleep(100);
})

Deno.test('individual item can have its own maxAge > cache', async function () {
  var cache = new LRUCache({
    max: 5,
    maxAge: 20
  })

  cache.set('a', 'A', 50)
  setTimeout(function () {
    t.assertEquals(cache.get('a'), 'A')
    //t.end()
  }, 25)
  await sleep(100);
})

Deno.test('disposal function', function () {
  var disposed = false
  var cache = new LRUCache({
    max: 1,
    dispose: function (k, n) {
      disposed = n
    }
  })

  cache.set(1, 1)
  cache.set(2, 2)
  t.assertEquals(disposed, 1)
  cache.set(2, 10)
  t.assertEquals(disposed, 2)
  cache.set(3, 3)
  t.assertEquals(disposed, 10)
  cache.reset()
  t.assertEquals(disposed, 3)
  //t.end()
})

Deno.test('no dispose on set', function () {
  var disposed = false
  var cache = new LRUCache({
    max: 1,
    noDisposeOnSet: true,
    dispose: function (k, n) {
      disposed = n
    }
  })

  cache.set(1, 1)
  cache.set(1, 10)
  t.assertEquals(disposed, false)
  //t.end()
})

Deno.test('disposal function on too big of item', function () {
  var disposed = false
  var cache = new LRUCache({
    max: 1,
    length: function (k) {
      return k.length
    },
    dispose: function (k, n) {
      disposed = n
    }
  })
  var obj = [ 1, 2 ]

  t.assertEquals(disposed, false)
  cache.set('obj', obj)
  t.assertEquals(disposed, obj)
  //t.end()
})

Deno.test('has()', async function () {
  var cache = new LRUCache({
    max: 1,
    maxAge: 10
  })

  cache.set('foo', 'bar')
  t.assertEquals(cache.has('foo'), true)
  cache.set('blu', 'baz')
  t.assertEquals(cache.has('foo'), false)
  t.assertEquals(cache.has('blu'), true)
  setTimeout(function () {
    t.assertEquals(cache.has('blu'), false)
    //t.end()
  }, 15)
  await sleep(50);
})

Deno.test('stale', async function () {
  var cache = new LRUCache({
    maxAge: 10,
    stale: true
  })

  t.assertEquals(cache.allowStale, true)
  cache.allowStale = false
  t.assertEquals(cache.allowStale, false)
  cache.allowStale = true
  t.assertEquals(cache.allowStale, true)

  cache.set('foo', 'bar')
  t.assertEquals(cache.get('foo'), 'bar')
  t.assertEquals(cache.has('foo'), true)
  setTimeout(function () {
    t.assertEquals(cache.has('foo'), false)
    t.assertEquals(cache.get('foo'), 'bar')
    t.assertEquals(cache.get('foo'), undefined)
    //t.end()
  }, 15)

  await sleep(50);
})

Deno.test('LRUCache update via set', function () {
  var cache = new LRUCache({ max: 2 })

  cache.set('foo', 1)
  cache.set('bar', 2)
  cache.del('bar')
  cache.set('baz', 3)
  cache.set('qux', 4)

  t.assertEquals(cache.get('foo'), undefined)
  t.assertEquals(cache.get('bar'), undefined)
  t.assertEquals(cache.get('baz'), 3)
  t.assertEquals(cache.get('qux'), 4)
  //t.end()
})

Deno.test('least recently set w/ peek', function () {
  var cache = new LRUCache(2)
  cache.set('a', 'A')
  cache.set('b', 'B')
  t.assertEquals(cache.peek('a'), 'A')
  cache.set('c', 'C')
  t.assertEquals(cache.get('c'), 'C')
  t.assertEquals(cache.get('b'), 'B')
  t.assertEquals(cache.get('a'), undefined)
  //t.end()
})

Deno.test('pop the least used item', function () {
  var cache = new LRUCache(3)
  var last

  cache.set('a', 'A')
  cache.set('b', 'B')
  cache.set('c', 'C')

  t.assertEquals(cache.length, 3)
  t.assertEquals(cache.max, 3)

  // Ensure we pop a, c, b
  cache.get('b', 'B')

  last = cache.pop()
  t.assertEquals(last.key, 'a')
  t.assertEquals(last.value, 'A')
  t.assertEquals(cache.length, 2)
  t.assertEquals(cache.max, 3)

  last = cache.pop()
  t.assertEquals(last.key, 'c')
  t.assertEquals(last.value, 'C')
  t.assertEquals(cache.length, 1)
  t.assertEquals(cache.max, 3)

  last = cache.pop()
  t.assertEquals(last.key, 'b')
  t.assertEquals(last.value, 'B')
  t.assertEquals(cache.length, 0)
  t.assertEquals(cache.max, 3)

  last = cache.pop()
  t.assertEquals(last, null)
  t.assertEquals(cache.length, 0)
  t.assertEquals(cache.max, 3)

  //t.end()
})

Deno.test('get and set only accepts strings and numbers as keys', function () {
  var cache = new LRUCache()

  cache.set('key', 'value')
  cache.set(123, 456)

  t.assertEquals(cache.get('key'), 'value')
  t.assertEquals(cache.get(123), 456)

  //t.end()
})

Deno.test('peek with wierd keys', function () {
  var cache = new LRUCache()

  cache.set('key', 'value')
  cache.set(123, 456)

  t.assertEquals(cache.peek('key'), 'value')
  t.assertEquals(cache.peek(123), 456)

  t.assertEquals(cache.peek({
    toString: function () { return 'key' }
  }), undefined)

  //t.end()
})

Deno.test('invalid length calc results in basic length', function () {
  var l = new LRUCache({ length: true })
  t.assert(typeof l.lengthCalculator == 'function')
  l.lengthCalculator = 'not a function'
  t.assert(typeof l.lengthCalculator == 'function')
  //t.end()
})

Deno.test('change length calculator recalculates', function () {
  var l = new LRUCache({ max: 3 })
  l.set(2, 2)
  l.set(1, 1)
  l.lengthCalculator = function (key, val) {
    return key + val
  }
  t.assertEquals(l.itemCount, 1)
  t.assertEquals(l.get(2), undefined)
  t.assertEquals(l.get(1), 1)
  l.set(0, 1)
  t.assertEquals(l.itemCount, 2)
  l.lengthCalculator = function (key, val) {
    return key
  }
  t.assertEquals(l.lengthCalculator(1, 10), 1)
  t.assertEquals(l.lengthCalculator(10, 1), 10)
  l.lengthCalculator = { not: 'a function' }
  t.assertEquals(l.lengthCalculator(1, 10), 1)
  t.assertEquals(l.lengthCalculator(10, 1), 1)
  //t.end()
})

Deno.test('delete non-existent item has no effect', function () {
  var l = new LRUCache({ max: 2 })
  l.set('foo', 1)
  l.set('bar', 2)
  l.del('baz')
  t.assertEquals(l.dumpLru().toArray().map(function (hit) {
    return hit.key
  }), [ 'bar', 'foo' ])
  //t.end()
})

Deno.test('maxAge on list, cleared in forEach', function () {
  var l = new LRUCache({ stale: true })
  l.set('foo', 1)

  // hacky.  make it seem older.
  l.dumpLru().head.value.now = Date.now() - 100000

  t.assertEquals(l.maxAge, 0)

  l.maxAge = 1

  var saw = false
  l.forEach(function (val, key) {
    saw = true
    t.assertEquals(key, 'foo')
  })
  t.assert(saw)
  t.assertEquals(l.length, 0)

  //t.end()
})

Deno.test('bad max/maxAge options', () => {
  t.assertThrows(() => new LRUCache({ maxAge: true })); //, null, 'maxAge must be a number')
  t.assertThrows(() => { new LRUCache().maxAge = 'foo' }); //, null, 'maxAge must be a number')
  t.assertThrows(() => new LRUCache({ max: true })); //, null, 'max must be a non-negative number')
  t.assertThrows(() => { new LRUCache().max = 'foo' }); //, null, 'max must be a non-negative number')
  const c = new LRUCache({
    max: 2
  })
  t.assertThrows(() => c.set('a', 'A', 'true')); //, null, 'maxAge must be a number')
  //t.end()
})

Deno.test('update age on get', () => {
  const l = new LRUCache({ updateAgeOnGet: true, maxAge: 10 })
  l.set('foo', 'bar')
  const e1 = l.dump()[0].e
  // spin for 5ms
  for (let then = Date.now() + 5; then > Date.now(); );
  l.get('foo')
  const e2 = l.dump()[0].e
  // spin for 5ms
  for (let then = Date.now() + 5; then > Date.now(); );
  l.get('foo')
  const e3 = l.dump()[0].e
  t.assert(e1 < e2, 'time updated on first get')
  t.assert(e2 < e3, 'time updated on second get')
  //t.end()
})
