/* global assert:true */
'use strict'

// prepare environment for js-data-adapter-tests
'babel-polyfill'

import { assert } from 'chai'
import * as JSDataSapHana from './src/index'

describe('exports', function () {
  it('should have correct exports', function () {
    assert(JSDataSapHana.SapHanaAdapter)
    assert(JSDataSapHana.OPERATORS)
    assert(JSDataSapHana.OPERATORS['=='])
    assert(JSDataSapHana.version)
  })
})

require('./test/count.spec')
require('./test/create.spec')
require('./test/destroy.spec')
require('./test/find.spec')
require('./test/parseQuery.spec')
require('./test/update.spec')
