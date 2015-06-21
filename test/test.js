import { fail, strictEqual as eq } from 'assert'
import { readFileSync as read } from 'fs'
import createSubContext from '../src'

// sort-of-kind-of makes require.js work in node.js semi-without globals
const installRequire = Function(read(
  require.resolve('../node_modules/requirejs/require.js'), 'utf-8'
) + '; this.require = require, this.define = define')
const makeRequire = (req = {}) => {
  installRequire.call(req)
  req.require.load = (context, moduleName, url) => {
    throw new Error('attempting to load() ' + moduleName)
  }
  return req
}

describe('require.js', () => {

  let req = makeRequire()

  it('does basic define/require', done => {
    req.define('test', () => 1)
    req.require([ 'test' ], val => { eq(val, 1), done() }, fail)
  })

  it('supports different contexts', done => {
    req.define('abc', () => 3)
    req.define('test', [ 'abc' ], (abc) => 2 + abc)
    req.require(
      { context: 'different' },
      [ 'test' ],
      val => { eq(val, 5), done() },
      fail
    )
  })

})

describe('subcontext', () => {

  let req = makeRequire()

  it('does basic define/require', done => {
    req.define('abc', 'abc')
    req.define('def', [ 'abc' ], abc => `${abc}def`)
    req.require([ 'def' ], def => { eq(def, 'abcdef'), done() }, fail)
  })

  it('inherits contexts', done => {
    // abc and def defined in parent context
    // the "abc" dependency should refer to the parent context
    // the "def" module should be defined in the child context
    req.define('def', [ 'abc' ], abc => `${abc}Subdef`) // 4 + 6
    let context = createSubContext('different', '_', req.require)
    context.require([ 'def' ], def => { eq(def, 'abcSubdef'), done() }, fail)
  })

  it('separates different contexts properly', done => {
    let one = createSubContext('one', '_', req.require)
    let two = createSubContext('two', '_', req.require)

    // fake define() calls
    one.defQueue.push([ 'test-test', [ 'abc' ], abc => `${abc}... ONE!` ])
    two.defQueue.push([ 'test-test', [ 'abc' ], abc => `${abc}... TWO!` ])

    req.require({ context: 'one' }, [ 'test-test' ], val => {
      eq(val, 'abc... ONE!')
      req.require({ context: 'two' }, [ 'test-test' ], val => {
        eq(val, 'abc... TWO!')
        done()
      }, fail)
    }, fail)
  })

  it('finds the right modules when a parent context module is specified ' +
     'but not loaded', done => {
    // "abc", "def", "ghi" and "more" in parent context
    req.define('ghi', 'ghi')
    req.define('more', 'more')
    req.require([ 'ghi', 'more' ], (ghi, more) => {
      eq(ghi, 'ghi')
      eq(more, 'more')
      let context = createSubContext('overwritesGhi', '_', req.require)
      // simulate define() call
      context.defQueue.push([ 'ghi', [], 'overwroteGhi' ])
      // inherit from overwritesGhi
      createSubContext('overwritesMore', 'overwritesGhi', req.require)
      req.define('more', [ 'ghi' ], ghi => `${ghi.slice(0, 9)}Less`)
      req.require({ context: 'overwritesMore' }, [ 'more' ], more => {
        eq(more, 'overwroteLess')
        done()
      }, fail)
    }, fail)
  })

  it('finds modules in grandparent contexts that were specified ' +
     'but not loaded', done => {
    let origin = createSubContext('origin', '_',      req.require)
    let sub1   = createSubContext('sub1',   'origin', req.require)
    let sub2   = createSubContext('sub2',   'sub1',   req.require)

    origin.defQueue.push([ 'something', [], 'something' ])
    sub1.defQueue.push([ 'else', [], 'lol' ])
    sub2.defQueue.push([ 'else', [ 'something' ], s => `${s} else` ])

    req.require({ context: 'sub2' }, [ 'else' ], val => {
      eq(val, 'something else')
      done()
    }, fail)
  })

})
