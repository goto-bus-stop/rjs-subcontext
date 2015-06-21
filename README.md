require.js subcontext
=====================

Function to create require.js contexts that share modules with parent contexts
(inherit from other contexts), but still have their own modules. It's like a
prototype chain for require.js contexts.

[![NPM](https://nodei.co/npm/rjs-subcontext.png?compact=true)](https://nodei.co/npm/rjs-subcontext)

## Usage

```javascript
const createSubContext = require('rjs-subcontext')

createSubContext('subcontext_name')

require({ context: 'subcontext_name' }
       , [ 'dependency' ]
       , function (dep) { /* do something */ })
```

Now, the "dependency" will be loaded from the "subcontext_name" context if it is
defined there, or from the global context if it is defined there. If the
requested module can not be found on any of the parent contexts, it's loaded
through the child context instead.

## #AnotherExample

A simple, contrived app with a custom view layer based on jQuery and Handlebars:

```javascript
// top-level libraries context
require({ context: 'Libraries' })
createSubContext('Helpers', 'Libraries')
createSubContext('Views', 'Helpers')
```

With module definitions:

 * Libraries context:
   * `jquery`
   * `handlebars`
 * Helpers context:
   * `handlebars`
   * `handlebars-helpers`, depends on `handlebars` and `jquery`
 * Views context:
   * `view`, depends on `jquery`
   * `login-view`, depends on `view` and `handlebars`

Now, `require()` does the followng:

 * `require({ context: 'Views' }, [ 'view' ])` loads "view" from the Views
   context. "view" depends on jQuery, which is loaded from the Libraries
   context.
 * `require({ context: 'Views' }, [ 'handlebars-helpers' ])` loads
   "handlebars-helpers" from the Helpers context. It depends on "handlebars",
   which is also loaded from the Helpers context, and on "jquery" which is
   loaded from the Libraries context.
 * `require({ context: 'Libraries' }, [ 'handlebars' ])` loads "handlebars" from
   the Libraries context.

## Building

`rjs-subcontext` uses Babel:

```
npm run babel
```

## License

[MIT](./LICENSE)
