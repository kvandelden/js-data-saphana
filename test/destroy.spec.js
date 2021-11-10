import { expect } from 'chai'
import {
  initTest,
  MAPPER_WB_QUEUE
} from './initTest'

describe('SapHanaAdapter#destroy', function () {
  let adapter
  let store
  let mapper

  beforeEach(function () {
    ({ adapter, store } = initTest())
    mapper = store.getMapper(MAPPER_WB_QUEUE)
  })

  it('should destroy a record by the given id', function () {
    const id = 100100100
    const newRecord = {
      WB_QUEUE_ID: id
    }
    return adapter.create(mapper, newRecord)
      .then((record) => {
        expect(record).to.be.an('object')
        return adapter.destroy(mapper, id)
      })
      .then((affectedCount) => {
        expect(affectedCount).equal(1)
        return adapter.find(mapper, id)
      })
      .then(([res]) => {
        expect(res).to.be.an('undefined')
      })
  })

  it('should destroy multiple records filtered by the given query', function () {
    const ids = [
      100100200,
      100100300,
      100100400
    ]
    const records = ids.map(id => ({
      WB_QUEUE_ID: id
    }))
    const query = {
      WB_QUEUE_ID: {
        in: ids
      }
    }

    return adapter.createMany(mapper, records)
      .then(() => {
        return adapter.destroyAll(mapper, query)
      })
      .then((affectedCount) => {
        expect(affectedCount).equal(3)

        return adapter.findAll(mapper, query)
      })
      .then((res) => {
        expect(res).to.be.an('array')
        expect(res).to.have.length(0)
      })
  })
})
