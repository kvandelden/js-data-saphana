import { assert } from 'chai'
import { SapHanaAdapter } from '../dist/js-data-saphana'
import {
  initTest
} from './initTest'

describe('SapHanaAdapter#parseQuery', function () {
  let adapter
  let query = {}
  let expectedQuery = ''

  beforeEach(function () {
    ({ adapter } = initTest())
  })

  it('should create an instance of SapHanaAdapter', function () {
    assert.instanceOf(adapter, SapHanaAdapter, 'adapter is an instance of Adapter')
  })

  it('should create a WHERE clause from query', function () {
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      name: 'Sean',
      age: 30
    }
    expectedQuery = " WHERE name = 'Sean' AND age = 30"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      where: {
        age: {
          '>': 20,
          '<': 50,
          '!=': 30,
          '<>': 40
        },
        or: [
          { id: { '=': 1 } },
          { id: { '==': 5 } }
        ]
      }
    }
    expectedQuery = ' WHERE (age > 20 AND age < 50 AND age <> 30 AND age <> 40) AND (id = 1 OR id = 5)'
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      where: {
        aId: { in: ['1', '2', '3'] },
        bId: { inq: [4, 5, 6] },
        cId: { nin: ['7', 8, '9'] },
        dId: { notin: ['x', 'y'] },
        startDt: { gte: '2000' },
        endDt: { lte: '2020' }
      }
    }
    expectedQuery = " WHERE aId IN ('1', '2', '3')" +
      ' AND bId IN (4, 5, 6)' +
      " AND cId NOT IN ('7', 8, '9')" +
      " AND dId NOT IN ('x', 'y')" +
      " AND startDt >= '2000'" +
      " AND endDt <= '2020'"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      where: {
        name: { like: 'john' },
        address: { nlike: 'street' }
      }
    }
    expectedQuery = " WHERE name LIKE 'john' AND address NOT LIKE 'street'"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      where: {
        name: { ilike: '%john%doe%' },
        address: { likei: 'street' }
      }
    }
    expectedQuery = " WHERE LOWER(name) LIKE LOWER('%john%doe%') AND LOWER(address) LIKE LOWER('street')"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)
  })

  it('should create a WHERE clause with relations based on AND and OR keyword from query', function () {
    query = {
      where: {
        aId: 3,
        and: [
          {
            DAY_DT: { gte: '2000' }
          },
          {
            DAY_DT: { lte: '2020' }
          }
        ],
        bId: { in: [3, 4] }
      }
    }
    expectedQuery = " WHERE aId = 3 AND (DAY_DT >= '2000' AND DAY_DT <= '2020') AND bId IN (3, 4)"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      aId: { inq: ['x', 'y'] },
      or: [
        {
          role: 'admin'
        },
        {
          access: 'all'
        }
      ],
      bId: 3
    }
    expectedQuery = " WHERE aId IN ('x', 'y') AND (role = 'admin' OR access = 'all') AND bId = 3"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      where: {
        and: [
          {
            or: [
              { a: 'a' },
              { b: 'b' }
            ]
          },
          {
            or: [
              { c: 'c' },
              { d: 'd' }
            ]
          }
        ]
      }
    }
    expectedQuery = " WHERE ((a = 'a' OR b = 'b') AND (c = 'c' OR d = 'd'))"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)

    query = {
      where: {
        or: [
          {
            and: [
              { a: 'a' },
              { b: 'b' }
            ]
          },
          {
            and: [
              { c: 'c' },
              { d: 'd' }
            ]
          }
        ]
      }
    }
    expectedQuery = " WHERE ((a = 'a' AND b = 'b') OR (c = 'c' AND d = 'd'))"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)
  })

  it('should create a WHERE clause with query.where being an array', function () {
    query = {
      where: [
        {
          and: [
            { count: { gt: 20 } },
            { count: { lt: 50 } }
          ]
        },
        {
          or: [
            { role: 'admin' },
            { access: 'all' }
          ]
        },
        [
          { a: 'a' },
          { b: 'b' }
        ]
      ]
    }
    expectedQuery = ' WHERE (count > 20 AND count < 50)' +
      " AND (role = 'admin' OR access = 'all')" +
      " AND (a = 'a' AND b = 'b')"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)
  })

  it('should create a WHERE clause with query.where being a string', function () {
    query = {
      where: " WHERE name = 'Sean' AND age = 30"
    }
    expectedQuery = " WHERE name = 'Sean' AND age = 30"
    assert.deepEqual(adapter.parseQuery(query), expectedQuery)
  })

  it('should create a LIMIT clause from query', function () {
    query = { limit: 3 }
    expectedQuery = ' LIMIT 3'
    assert.equal(adapter.parseQuery(query), expectedQuery)
  })

  it('should create an ORDER BY clause from query', function () {
    query = { orderBy: 'name' }
    expectedQuery = " ORDER BY 'name' ASC"
    assert.equal(adapter.parseQuery(query), expectedQuery)

    query = { orderBy: ['age', 'name'] }
    expectedQuery = " ORDER BY 'age' ASC, 'name' ASC"
    assert.equal(adapter.parseQuery(query), expectedQuery)

    query = {
      orderBy: [
        ['age', 'DESC'],
        ['name', 'ASC']
      ]
    }
    expectedQuery = " ORDER BY 'age' DESC, 'name' ASC"
    assert.equal(adapter.parseQuery(query), expectedQuery)
  })

  it('should create a OFFSET clause from query', function () {
    expectedQuery = ' OFFSET 3'
    query = { offset: 3 }
    assert.equal(adapter.parseQuery(query), expectedQuery)

    query = { skip: 3 }
    assert.equal(adapter.parseQuery(query), expectedQuery)
  })

  it('should create a complete clause from query', function () {
    query = {
      role: 'admin',
      age: 30,
      skip: 10,
      limit: 5,
      orderBy: [
        ['role', 'desc'],
        ['age']
      ]
    }
    expectedQuery = " WHERE role = 'admin' AND age = 30 ORDER BY 'role' DESC, 'age' ASC LIMIT 5 OFFSET 10"
    assert.equal(adapter.parseQuery(query), expectedQuery)
  })
})
