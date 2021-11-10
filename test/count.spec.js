import { expect } from 'chai'
import {
  initTest,
  MAPPER_WB_QUEUE
} from './initTest'

describe('SapHanaAdapter#count', function () {
  let adapter, store, mapper

  beforeEach(function () {
    ({ adapter, store } = initTest())
    mapper = store.getMapper(MAPPER_WB_QUEUE)
  })

  it('should return the count of the given mapper', function () {
    const expectedCount = 1382694
    return adapter.count(mapper)
      .then((res) => {
        expect(res).to.be.a('number')
        expect(res).equal(expectedCount)
      })
  })

  it('should return the count of the given mapper filtered by query', function () {
    const query1 = {
      ITEM_WB_ID: 579228793
    }
    const expectedCount1 = 680
    const query2 = {
      ITEM_WB_ID: 732582598,
      CREATED_DTTS: {
        'like': '202108%'
      }
    }
    const expectedCount2 = 42
    return adapter.count(mapper, query1)
      .then((res) => {
        expect(res).to.be.a('number')
        expect(res).equal(expectedCount1)

        return adapter.count(mapper, query2)
      })
      .then((res) => {
        expect(res).to.be.a('number')
        expect(res).equal(expectedCount2)
      })
  })
})

describe('SapHanaAdapter#sum', function () {
  let adapter, store, mapper

  beforeEach(function () {
    ({ adapter, store } = initTest())
    mapper = store.getMapper(MAPPER_WB_QUEUE)
  })

  it('should return the sum of the given column filtered by query', function () {
    const records = [
      {
        WB_QUEUE_ID: 100100100,
        WB_JOB_ID: 1000
      },
      {
        WB_QUEUE_ID: 100100200,
        WB_JOB_ID: 2000
      },
      {
        WB_QUEUE_ID: 100100300,
        WB_JOB_ID: 3000
      },
      {
        WB_QUEUE_ID: 100100400,
        WB_JOB_ID: 4000
      }
    ]
    const query = {
      WB_QUEUE_ID: {
        in: [100100100, 100100200, 100100300, 100100400]
      }
    }
    return adapter.createMany(mapper, records)
      .then(() => {
        return adapter.sum(mapper, 'WB_JOB_ID', query)
      })
      .then((res) => {
        expect(res).equal(10000)
        return adapter.destroyAll(mapper, query)
      })
  })
})
