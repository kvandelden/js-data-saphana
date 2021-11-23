import { expect } from 'chai'
import {
  initTest,
  MAPPER_WB_QUEUE
} from './initTest'

describe('SapHanaAdapter#update', function () {
  let adapter
  let store
  let mapper

  const queueId = 'PlanCalc'
  const createDt = '20211109100000'

  beforeEach(function () {
    ({ adapter, store } = initTest())
    mapper = store.getMapper(MAPPER_WB_QUEUE)
  })

  it('should update a record', function () {
    const id = 100100100

    const newRecord = {
      WB_QUEUE_ID: id
    }
    return adapter.create(mapper, newRecord)
      .then(() => {
        return adapter.update(mapper, id, {
          QUEUE_ID: queueId,
          CREATED_DTTS: createDt
        })
      })
      .then(() => {
        return adapter.find(mapper, id)
      })
      .then((res) => {
        expect(res).to.be.an('object')
        expect(res.WB_QUEUE_ID).equal(id)
        expect(res.QUEUE_ID).equal(queueId)
        expect(res.CREATED_DTTS).equal(createDt)

        return adapter.destroy(mapper, id)
      })
  })

  it('should update all records filtered by the given query', function () {
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
        return adapter.updateAll(mapper, {
          QUEUE_ID: queueId,
          CREATED_DTTS: createDt
        }, query)
      })
      .then(() => {
        return adapter.findAll(mapper, query)
      })
      .then((res) => {
        expect(res).to.be.an('array')
        expect(res).to.have.length(3)
        res.forEach(record => {
          expect(record.QUEUE_ID).equal(queueId)
          expect(record.CREATED_DTTS).equal(createDt)
        })
        return adapter.destroyAll(mapper, query)
      })
  })

  it('should update given records', function () {
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
        return adapter.updateMany(mapper, [
          {
            WB_QUEUE_ID: 100100200,
            QUEUE_ID: queueId
          },
          {
            WB_QUEUE_ID: 100100300,
            CREATED_DTTS: createDt
          },
          {
            WB_QUEUE_ID: 100100400,
            QUEUE_ID: queueId,
            CREATED_DTTS: createDt
          }
        ])
      })
      .then(() => {
        return adapter.findAll(mapper, query)
      })
      .then((res) => {
        expect(res).to.be.an('array')
        expect(res).to.have.length(3)

        res.sort(function (el1, el2) {
          return el1.WB_QUEUE_ID - el2.WB_QUEUE_ID
        })
        expect(res[0].QUEUE_ID).equal(queueId)
        expect(res[0].CREATED_DTTS).equal('0')
        expect(res[1].QUEUE_ID).equal('')
        expect(res[1].CREATED_DTTS).equal(createDt)
        expect(res[2].QUEUE_ID).equal(queueId)
        expect(res[2].CREATED_DTTS).equal(createDt)

        return adapter.destroyAll(mapper, query)
      })
  })
})
