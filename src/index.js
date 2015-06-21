
function merge(a, b) {
  Object.keys(b).forEach(key => { a[key] = b[key] })
  return a
}

function inherit(sub, parent) {
  sub.parent = parent

  let makeRequire = sub.makeRequire
  sub.makeRequire = (relMap, options) => {
    let req = makeRequire.call(sub, relMap, options)
    let subReq = (deps, callback, errback) => {
      deps = Array.isArray(deps)? deps
           : deps?                [ deps ]
           : /* otherwise */      []
      deps.forEach(dep => {
        if (sub.require.specified(dep)) {
          return req(deps)
        }
        else if (sub.parent.require.specified(dep)) {
          return sub.parent.require(dep)
        }
      })
      return req(deps, callback, errback)
    }

    merge(subReq, req)

    return merge(subReq, {
      // also check if a module is specified in a parent context
      specified(id) {
        return req.specified(id) || sub.parent.require.specified(id)
      }
    })
  }

  sub.require = sub.makeRequire()

  // load() is called when a module cannot be found locally.
  // at this point we can hook in and try to find the module in the parent(s),
  // before loading new modules from the web/wherever.
  let load = sub.load
  sub.load = (id, url) => {
    if (sub.parent.require.specified(id)) {
      return sub.parent.require([ id ], result => {
        // redefine the parent module on this context, as well, using a fake
        // define() call on this context. no dependencies needed because we
        // already have the full thing :D
        sub.defQueue.push([ id, [], () => result ])
        sub.completeLoad(id)
      })
    }
    return load(id, url)
  }

  return sub
}

createSubContext.inherit = inherit

export default function createSubContext(name, parent = null, req = null) {
  if (!req) req = window.requirejs

  if (typeof parent === 'string') {
    parent = req.s.contexts[parent]
  }
  else if (parent === null) {
    parent = req.s.contexts._
  }

  // force creation of a new context
  req({ context: name })

  let sub = req.s.contexts[name]

  return inherit(sub, parent)
}
