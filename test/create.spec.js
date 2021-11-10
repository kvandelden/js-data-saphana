import { expect } from 'chai'
import {
  initTest,
  MAPPER_WB_QUEUE
} from './initTest'

describe('SapHanaAdapter#create', function () {
  let adapter
  let store
  let mapper

  beforeEach(function () {
    ({ adapter, store } = initTest())
    mapper = store.getMapper(MAPPER_WB_QUEUE)
  })

  it('should create one persistent record in db by create()', function () {
    const id = 100100100
    const newRecord = {
      WB_QUEUE_ID: id
    }

    return adapter.create(mapper, newRecord)
      .then((res) => {
        expect(res).to.deep.equal(newRecord)
        return adapter.find(mapper, id)
      })
      .then(([res]) => {
        expect(res).to.be.an('object')
        expect(res.WB_QUEUE_ID).equal(id)
        return adapter.destroy(mapper, id)
      })
  })

  it('should create multiple persistent records in db by createMany()', function () {
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
      .then((res) => {
        expect(res).to.be.an('array')
        expect(res).to.have.length(3)
        expect(res[0]).to.be.deep.equal(records[0])

        return adapter.findAll(mapper, query)
      })
      .then((res) => {
        expect(res).to.be.an('array')
        expect(res).to.have.length(3)

        const recordIds = res.map(record => record.WB_QUEUE_ID).sort()
        expect(ids).to.deep.equal(recordIds)

        return adapter.destroyAll(mapper, query)
      })
  })
})
