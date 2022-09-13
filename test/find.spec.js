import { expect } from 'chai'
import {
  initTest,
  MAPPER_WB_QUEUE
} from './initTest'

describe('SapHanaAdapter#findAll', function () {
  let adapter
  let store
  let mapper

  beforeEach(function () {
    ({ adapter, store } = initTest())
    mapper = store.getMapper(MAPPER_WB_QUEUE)
  })

  it('should find a record with the given id', function () {
    const id = 579941438
    const ITEM_WB_ID = 579228793
    return adapter.find(mapper, id)
      .then((record) => {
        expect(record).to.be.an('object')
        expect(record.ITEM_WB_ID).equal(ITEM_WB_ID)
      })
  })

  it('should return undefined when id is undefined', function () {
    return adapter.find(mapper, undefined)
      .then((record) => {
        expect(record).to.be.undefined
      })
  })

  it('should find all records filtered by a query', function () {
    const query = {
      where: {
        ITEM_WB_ID: 732582598,
        CREATED_DTTS: {
          like: '202108%'
        }
      }
    }
    const count = 42
    return adapter.findAll(mapper, query)
      .then((records) => {
        expect(records).to.be.an('array')
        expect(records).to.have.length(count)
      })
  })
})
