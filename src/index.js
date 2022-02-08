import {utils} from 'js-data'
import * as hdbPool from "hdb-pool"

import {
  Adapter
} from 'js-data-adapter'
import toString from 'lodash.tostring'

const DEFAULTS = {}

const DEFAULT_POOL_OPTIONS = {
  max: 50,
  requestTimeout: 30000
}

const KEYWORD_AND = 'AND'
const KEYWORD_OR = 'OR'
const OPERATOR_EQUAL = '=='

export const OPERATORS = {
  '=': '=',
  [OPERATOR_EQUAL]: '=',
  'EQ': '=',
  '<>': '<>',
  '!=': '<>',
  'NEQ': '<>',
  '>': '>',
  'GT': '>',
  '>=': '>=',
  'GTE': '>=',
  '<': '<',
  'LT': '<',
  '<=': '<=',
  'LTE': '<=',
  'IN': 'IN',
  'INQ': 'IN',
  'NOTIN': 'NOT IN',
  'NIN': 'NOT IN',
  'LIKE': 'LIKE',
  'NLIKE': 'NOT LIKE',
  'ILIKE': 'LIKE', // case insensitive
  'LIKEI': 'LIKE' // case insensitive
}

Object.freeze(OPERATORS)

const RESERVED_KEYWORD = ['order', 'orderBy', 'sort', 'limit', 'offset', 'skip', 'where']

const CASE_INSENSITIVE_LIKE_OPERATORS = [
  'ILIKE',
  'LIKEI'
]

const CHECK_ARRAY_LENGTH_IN_OPERATORS = ['IN', 'INQ', 'NOTIN', 'NIN']

const UNATTAINABLE_CONDITION = '1 = 0'

  /**
 * Sap Hana Adapter class
 *
 * @example
 * // Use Container instead of DataStore on the server
 * import { Container } from 'js-data';
 * import SapHanaAdapter from 'js-data-saphana';
 *
 * // Create a store to hold your Mappers
 * const store = new Container();
 *
 * // Create an instance of SapHanaAdapter with default settings
 * const adapter = new SapHanaAdapter();
 *
 * // Mappers in "store" will use the SAP Hana adapter by default
 * store.registerAdapter('hana', adapter, { default: true });
 *
 * // Create a Mapper that maps to a "user" table
 * store.defineMapper('user');
 *
 * @class SapHanaAdapter
 * @extends Adapter
 * @param {Object} [opts] Configuration options.
 * @param {boolean} [opts.debug=false] See {@link Adapter#debug}
 * @param {Object} [opts.hanaOpts] Configuration for SAP Hana connection
 * @param {Object} [opts.poolOpts] Configuration for connection pool
 * @param {boolean} [opts.raw=false] See {@link Adapter#raw}
 */
export function SapHanaAdapter (opts) {
  utils.classCallCheck(this, SapHanaAdapter)
  opts || (opts = {})
  opts.hanaOpts || (opts.hanaOpts = {})
  opts.poolOpts || (opts.poolOpts = {})
  utils.fillIn(opts.poolOpts, DEFAULT_POOL_OPTIONS)
  utils.fillIn(opts, DEFAULTS)

  // extract connection settings
  const hanaOpts = opts.hanaOpts
  const hostName = hanaOpts.hostName || hanaOpts.host
  const port = hanaOpts.port
  const userName = hanaOpts.userName || hanaOpts.uid
  const password = hanaOpts.password || hanaOpts.pwd
  const dbParams = {
    hostName,
    port,
    userName,
    password
  }

  const hashKey = `${hostName}:${port}:${userName}`
  Object.defineProperty(this, 'connectionHash', {
    writable: true,
    value: hashKey
  })
  if (!SapHanaAdapter.dctConnectionPool.hasOwnProperty(hashKey)) {
    SapHanaAdapter.dctConnectionPool[hashKey] = hdbPool.createPool(dbParams, opts.poolOpts)
  }

  Adapter.call(this, opts)
}

// Store the connection pools in a class-level dictionary
// so that multiple instances can share one if they have the same connection settings
Object.defineProperty(SapHanaAdapter, 'dctConnectionPool', {
  writable: true,
  value: {}
})

/**
 * Alternative to ES2015 class syntax for extending `SapHanaAdapter`.
 *
 * @example <caption>Using the ES2015 class syntax.</caption>
 * class MyHanaAdapter extends SapHanaAdapter {...};
 * const adapter = new MyHanaAdapter();
 *
 * @example <caption>Using {@link SapHanaAdapter.extend}.</caption>
 * const instanceProps = {...};
 * const classProps = {...};
 *
 * const MyHanaAdapter = SapHanaAdapter.extend(instanceProps, classProps);
 * const adapter = new MyHanaAdapter();
 *
 * @method SapHanaAdapter.extend
 * @static
 * @param {Object} [instanceProps] Properties that will be added to the
 * prototype of the subclass.
 * @param {Object} [classProps] Properties that will be added as static
 * properties to the subclass itself.
 * @return {Constructor} Subclass of `SapHanaAdapter`.
 */
SapHanaAdapter.extend = utils.extend

Adapter.extend({
  constructor: SapHanaAdapter,

  _getPool () {
    return SapHanaAdapter.dctConnectionPool[this.connectionHash]
  },

  _getConnection () {
    const pool = this._getPool()
    return new Promise((resolve, reject) => {
      pool.getConnection()
        .then((connection) => {
          resolve(connection)
        })
        .catch(reject)
    })
  },

  _releaseConnection (connection) {
    const pool = this._getPool()
    return new Promise((resolve, reject) => {
      pool.release(connection)
        .catch(reject)
    })
  },

  _executeSql (connection, sql) {
    return new Promise((resolve, reject) => {
      connection.exec(sql, (error, result) => {
        if (error) {
          reject(error)
        } else {
          // Wrap the result in an array before js-data-adapter takes over.
          resolve([result])
        }
      })
    })
  },

  _execute (sql) {
    return new Promise((resolve, reject) => {
      let connection = null
      this._getConnection()
        .then((conn) => {
          connection = conn
          return this._executeSql(conn, sql)
        }).then((result) => {
          resolve(result)
          return this._releaseConnection(connection)
        }).catch((err) => {
          reject(err)
        })
    })
  },

  afterCount (mapper, query, opts, response) {
    if (response && response.length > 0) {
      const { COUNT } = response[0]
      return Promise.resolve(COUNT)
    }
    return Promise.reject(new Error(`count() failed with response: ${JSON.stringify(response)}`))
  },

  afterSum (mapper, field, query, opts, response) {
    if (response && response.length > 0) {
      const { SUM } = response[0]
      return Promise.resolve(SUM)
    }
    return Promise.reject(new Error(`sum() failed with response: ${JSON.stringify(response)}`))
  },

  _count (mapper, query, opts) {
    opts || (opts = {})
    query || (query = {})

    const table = this.getTable(mapper)
    const sql = `SELECT COUNT(*) AS COUNT FROM ${table}` + this.parseQuery(query)
    return this._execute(sql)
  },

  _create (mapper, props, opts) {
    props || (props = {})
    opts || (opts = {})

    if (utils.isArray(props)) {
      if (props.length === 0) {
        return Promise.reject(new Error('Empty input is invalid.'))
      }
    } else if (typeof props === 'object' && Object.keys(props).length === 0) {
      return Promise.reject(new Error('Empty input is invalid.'))
    }

    let columns, prepValues
    ({ columns, prepValues } = this._prepInsert(props))
    if (columns.length === 0) {
      return Promise.reject(new Error('Input is invalid.'))
    }

    const table = this.getTable(mapper)
    const sqlList = prepValues.map(prepValue => {
      // Convert prepValue into one string, joined with comma.
      // If a value is undefined, replace it with 'NULL'
      const prepValueStr = prepValue.reduce((prev, curr, currIndex) => {
        if (curr === undefined) {
          curr = 'NULL'
        }
        if (currIndex === 0) {
          return curr
        }
        return prev + ', ' + curr
      }, '')
      return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${prepValueStr})`
    })

    const sqlTasks = sqlList.map(sql => {
      return new Promise((resolve, reject) => {
        this._execute(sql)
          .then(resolve)
          .catch(reject)
      })
    })
    return new Promise((resolve, reject) => {
      Promise.all(sqlTasks)
        .then((res) => {
          if (!res || res.some(([affectedCount]) => affectedCount === 0)) {
            throw new Error(`Creation failed. SQL: ${sqlList.join('\n')}`)
          } else {
            resolve([props]) // return the newly created records
          }
        })
        .catch(reject)
    })
  },

  _createMany (mapper, props, opts) {
    props || (props = [])
    opts || (opts = {})

    return this._create(mapper, props, opts)
  },

  _destroy (mapper, id, opts) {
    opts || (opts = {})

    const table = this.getTable(mapper)
    const { idAttribute } = mapper
    const sql = `DELETE FROM ${table} WHERE "${idAttribute}" = ${toString(id)}`
    return this._execute(sql)
  },

  _destroyAll (mapper, query, opts) {
    query || (query = {})
    opts || (opts = {})

    const table = this.getTable(mapper)
    const sql = `DELETE FROM ${table}` + this.parseQuery(query)
    return this._execute(sql)
  },

  _find (mapper, id, opts) {
    opts || (opts = {})

    const table = this.getTable(mapper)
    const { idAttribute } = mapper
    const sql = `SELECT ${table}.*` +
      ` FROM ${table}` +
      ` WHERE ${table}."${idAttribute}" = ${toString(id)}`
    return new Promise((resolve, reject) => {
      this._execute(sql)
        .then((result) => {
          resolve(result[0])
        })
        .catch(reject)
    })
  },

  _findAll (mapper, query, opts) {
    query || (query = {})
    opts || (opts = {})

    const table = this.getTable(mapper)
    let sql = `SELECT ${table}.* FROM ${table}` + this.parseQuery(query)
    return this._execute(sql)
  },

  _sum (mapper, field, query, opts) {
    if (!utils.isString(field)) {
      throw new Error('field must be a string!')
    }
    opts || (opts = {})
    query || (query = {})

    const table = this.getTable(mapper)
    const sql = `SELECT SUM(${field}) AS sum FROM ${table}` + this.parseQuery(query)
    return this._execute(sql)
  },

  _update (mapper, id, props, opts) {
    props || (props = {})
    opts || (opts = {})

    const table = this.getTable(mapper)
    const { idAttribute } = mapper

    const conditions = this._prepUpdate(props)
    const sql = `UPDATE ${table} SET ` +
      conditions.join(', ') +
      ` WHERE "${idAttribute}" = ${toString(id)}`
    return this._execute(sql)
  },

  _updateAll (mapper, props, query, opts) {
    props || (props = {})
    query || (query = {})
    opts || (opts = {})

    const table = this.getTable(mapper)
    const conditions = this._prepUpdate(props)

    const sql = `UPDATE ${table} SET ` +
      conditions.join(', ') +
      this.parseQuery(query)
    return this._execute(sql)
  },

  _updateMany (mapper, records, opts) {
    records || (records = [])
    opts || (opts = {})

    const table = this.getTable(mapper)
    const { idAttribute } = mapper
    const sqlList = records.map((record) => {
      const id = record[idAttribute]
      const conditions = this._prepUpdate(record)
      return `UPDATE ${table} SET ` +
        conditions.join(', ') +
        ` WHERE "${idAttribute}" = ${toString(id)}`
    })

    const sqlTasks = sqlList.map(sql => {
      return new Promise((resolve, reject) => {
        this._execute(sql)
          .then(resolve)
          .catch(reject)
      })
    })
    return new Promise((resolve, reject) => {
      Promise.all(sqlTasks)
        .then((res) => {
          if (!res || res.some(([affectedCount]) => affectedCount === 0)) {
            throw new Error(`Update failed. SQL: ${sqlList.join('\n')}`)
          } else {
            resolve([res.length])
          }
        })
        .catch(reject)
    })
  },

  getTable (mapper) {
    return `"${mapper.schema.options.hdb.table}"`;
  },

  /**
   * Generate WHERE/ORDER BY/LIMIT/OFFSET clause
   *
   * @example <caption>Complex query</caption>
   * const PAGE_SIZE = 2;
   * let currentPage = 3;
   *
   * const query = {
   *  where: {
   *    status: {
   *      // WHERE status = 'published'
   *      '==': 'published'
   *    },
   *    author: {
   *      // author IN ('bob', 'alice')
   *      'in': ['bob', 'alice']
   *    },
   *    name: {
   *      // name LIKE 'john'
   *      like: 'john'
   *    },
   *    and: [
   *      // DAY_DT >= '2000' AND DAY_DT <= '2020'
   *      { DAY_DT: { gte: '2000' } },
   *      { DAY_DT: { lte: '2020' } }
   *    ]
   *  },
   *  orderBy: [
   *    // ORDER BY date_published DESC
   *    ['date_published', 'DESC'],
   *    // ORDER BY title ASC
   *    ['title', 'ASC'],
   *  ],
   *  limit: PAGE_SIZE, // LIMIT 2
   *  offset: PAGE_SIZE * (currentPage - 1) // SKIP 4
   * }
   *
   * @param {Object} query
   * @property {number} [limit] See {@link query.limit}
   * @property {number} [offset] See {@link query.offset}
   * @property {string|Array[]} [order] See {@link query.orderBy}
   * @property {string|Array[]} [orderBy] See {@link query.orderBy}
   * @property {number} [skip] Alias for {@link query.offset}
   * @property {string|Array[]} [sort] Alias for {@link query.orderBy}
   * @property {Object} [where] See {@link query.where}
   * @returns {string} SQL clauses
   */
  parseQuery (query) {
    query = utils.plainCopy(query || {})

    if (!utils.isObject(query)) {
      return ''
    }

    let whereClause = ''
    let orderByClause = ''
    let limitClause = ''
    let offsetClause = ''

    /**
     * Generate WHERE clause based on query.where, and attributes whose key is not in the 'RESERVED_KEYWORD' array.
     * @name query.where
     * @type {Object}
     */
    query.where || (query.where = {})
    if (utils.isString(query.where)) {
      whereClause = query.where
    } else if (utils.isObject(query.where) || utils.isArray(query.where)) {
      // Gather WHERE conditions outside the query.where.
      let whereObj = {}
      for (const [key, value] of Object.entries(query)) {
        if (RESERVED_KEYWORD.indexOf(key) === -1 && !(key in whereObj)) {
          whereObj[key] = value
        }
      }

      let whereArr = []
      if (utils.isObject(query.where)) {
        whereArr.push(Object.assign({}, whereObj, query.where))
      } else if (utils.isArray(query.where)) {
        whereArr.push(...query.where)
        if (Object.keys(whereObj).length > 0) {
          whereArr.push(whereObj)
        }
      }
      this._prepareWhereArray(whereArr)

      const whereConditions = this._parseWhereArray(whereArr, KEYWORD_AND, '', 1)
      if (whereConditions) {
        whereClause = ' WHERE ' + whereConditions
      }
    }

    /**
     * Generate ORDER BY clause based on query.orderBy
     *
     * @example <caption>Sort by age in ascending order</caption>
     * orderBy: 'age' => ORDER BY 'age' ASC
     *
     * @example
     * order: 'name asc, age desc' => ORDER BY 'name' ASC, 'age' DESC
     *
     * @example <caption>Sort by age and then name in ascending order</caption>
     * orderBy: ['age', 'name asc'] => ORDER BY 'age' ASC, 'name' ASC
     *
     * @example <caption>Sort by age in descending order and then name in ascending order to break a tie</caption>
     * orderBy: [
     *   ['age', 'DESC'],
     *   ['name', 'ASC'],
     * ] => ORDER BY 'age' DESC, 'name' ASC
     */
    let orderBy = query.order || query.orderBy || query.sort

    if (utils.isString(orderBy)) {
      orderBy = orderBy.split(',').map(s => s.trim())
    }
    if (!utils.isArray(orderBy)) {
      orderBy = null
    }

    if (orderBy && orderBy.length > 0) {
      orderBy.forEach((def, index) => {
        // In case of orderBy = ['age', 'name asc']
        if (utils.isString(def)) {
          const [column, order] = def.split(' ')
          orderBy[index] = [column, order ? order : 'ASC']
        }
        // In case of orderBy = [['age']]
        if (utils.isArray(def) && def.length === 1) {
          orderBy[index] = [...def, 'ASC']
        }
      })

      // combine to an order by clause
      orderByClause = ' ORDER BY ' + orderBy.map(([column, order]) => {
        return `'${column}' ${order.toUpperCase()}`
      }).join(', ')
    }

    /**
     * Generate OFFSET / LIMIT clause based on query.limit.
     *
     * @example <caption></caption>
     * const PAGE_SIZE = 10, currentPage = 1
     * query: {
     *   offset: PAGE_SIZE * currentPage,
     *   limit: PAGE_SIZE
     * } => LIMIT 10 OFFSET 10
     */
    if (utils.isNumber(query.limit)) {
      limitClause = ` LIMIT ${query.limit}`
    }
    if (utils.isNumber(query.skip)) {
      offsetClause = ` OFFSET ${query.skip}`
    } else if (utils.isNumber(query.offset)) {
      offsetClause = ` OFFSET ${query.offset}`
    }

    return whereClause + orderByClause + limitClause + offsetClause
  },

  /**
   * Convert to a valid SQL operator.
   * @param {string} op - key in OPERATORS
   * @return {string} sql keyword
   */
  _getOperator (op) {
    const upperCaseOp = op.toUpperCase()
    return OPERATORS[upperCaseOp] || upperCaseOp
  },

  /**
   * Generate a WHERE condition clause.
   * @param {string} field
   * @param {string} op - operator
   * @param {string} value - criteriaValue
   * @return {string}
   */
  _parseCondition (field, op, value) {
    const upperCaseOp = op.toUpperCase()
    const operator = this._getOperator(op)
    if (CASE_INSENSITIVE_LIKE_OPERATORS.includes(upperCaseOp)) {
      return `LOWER(${field}) ${operator} LOWER(${value})`
    }
    return field + ' ' + operator + ' ' + value
  },

  /**
   * If a criteriaValue is a string, wrap it with a pair of quotes before adding it to the SQL statement
   * @param {string} value - criteriaValue
   * @return {string}
   */
  _parseValue (value) {
    if (utils.isString(value)) {
      return "'" + value + "'"
    }
    return value
  },

  /**
   * Convert an array of conditions to a string.
   * @example
   * For such a query (keyword being AND or OR):
   * {
   *   or: [
   *     { DAY_DT: { gte: '2000' } },
   *     { DAY_DT: { lte: '2020' } }
   *   ]
   * }
   * => _parseWhereArray([{}, {}], 'or', _, _)
   * => DAY_DT >= '2000' OR DAY_DT <= '2020'
   *
   * @example
   * For such a query (keyword not being AND or OR):
   * {
   *   name: {
   *     'inq': ['a', 'b', 'c']
   *   }
   * }
   * => _parseWhereArray(['a', 'b', 'c'], 'inq', 'name', _)
   * => name IN ('a', 'b', 'c')
   *
   * @param {Array} valueArr - array of conditions
   * @param {string} op - operator
   * @param {string} field
   * @param {number} depth - recursion depth
   * @return {string}
   */
  _parseWhereArray (valueArr, op, field, depth) {
    const upperCaseOp = op.toUpperCase()
    if ([KEYWORD_AND, KEYWORD_OR].includes(upperCaseOp)) {
      const clauses = valueArr
        .filter(value => {
          return utils.isObject(value) || utils.isArray(value)
        })
        .map(value => {
          if (utils.isObject(value)) {
            return this._parseWhereObject(value, '', depth + 1)
          } else if (utils.isArray(value)) {
            return this._parseWhereArray(value, KEYWORD_AND, '', depth + 1)
          }
        })
        .reduce((prev, curr) => { // merge conditions into one array
          // curr could be a string or string[]
          if (utils.isArray(curr)) {
            return [...prev, ...curr]
          }
          return [...prev, curr]
        }, [])
        .join(` ${upperCaseOp} `)
      if (depth > 1 && valueArr.length > 1) {
        return `(${clauses})`
      }
      return clauses
    } else {
      // In case of "** in ()" or "** not in ()", return an unattainable condition
      if (valueArr.length === 0 && CHECK_ARRAY_LENGTH_IN_OPERATORS.includes(upperCaseOp)) {
        return UNATTAINABLE_CONDITION
      }
      const value = valueArr.map(this._parseValue).join(', ')
      return this._parseCondition(field, op, `(${value})`)
    }
  },

  /**
   * Convert an object to a list or conditions
   *
   * @example
   * where = {
   *   userId: { '==': 5 },
   *   age: { '>=': 30, '<=': 33 },
   *   role: { in: ['admin', owner'] }
   * }
   * => ['userId = 5', '(age >= 30 AND age <= 33)', "role IN ('admin', 'owner')"]
   *
   * @example
   * where = {
   *   name: { like: 'john' },
   *   address: { nlike: 'street' }
   * }
   * => ["name LIKE 'john'", "address NOT LIKE 'street'"]
   *
   * @example
   * where = {
   *   name: { ilike: '%john%doe%' },
   *   address: { likei: 'street' }
   * }
   * => ["LOWER(name) LIKE LOWER('%john%doe%')", "LOWER(address) LIKE LOWER('street')"]
   *
   * @param {Object} where - query
   * @param {string} field
   * @param {number} depth - recursion depth
   * @return {string[]}
   */
  _parseWhereObject (where, field, depth) {
    const conditions = []
    utils.forOwn(where, (value, key) => {
      const bUseField = key === OPERATOR_EQUAL
      let newCondition
      if (utils.isObject(value)) {
        newCondition = this._parseWhereObject(value, bUseField ? field : key, depth + 1)
        conditions.push(...newCondition)
      } else if (utils.isArray(value)) {
        newCondition = this._parseWhereArray(value, bUseField ? field : key, field, depth)
        conditions.push(newCondition)
      } else {
        newCondition = this._parseCondition(field, key, this._parseValue(value))
        conditions.push(newCondition)
      }
    })
    if (depth > 2 && conditions.length > 1) {
      return ['(' + conditions.join(' AND ') + ')']
    }
    return conditions
  },

  /**
   * Format WHERE clause input recursively.
   * @param {Array} whereArr
   * @private
   */
  _prepareWhereArray (whereArr) {
    whereArr.forEach((where) => {
      if (utils.isObject(where)) {
        this._prepareWhereObject(where)
      } else if (utils.isArray(where)) {
        this._prepareWhereArray(where)
      }
    })
  },

  /**
   * Format WHERE clause input recursively.
   * The goal is to make sure that in every key-value pair, the key is one of the OPERATORS.
   *
   * @example
   * where = {
   *   'field': 'value'
   * }
   * => where = {
   *   'field': {
   *     '==': 'value'
   *   }
   * }
   *
   * @param {Object} where
   */
  _prepareWhereObject (where) {
    utils.forOwn(where, (value, key) => {
      if (utils.isObject(value)) {
        this._prepareWhereObject(value)
      } else if (utils.isArray(value)) {
        this._prepareWhereArray(value)
      } else if (!(key.toUpperCase() in OPERATORS)) {
        where[key] = {
          [OPERATOR_EQUAL]: value
        }
      }
    })
  },

  /**
   * Prepare INSERT data
   *
   * @example
   * const a = 1, b = 2, c = '3', d = 4, e = 5
   * data = [
   *  { a, c, e },
   *  { a, b, c },
   *  { a, b, c, d, e }
   * ] => {
   *   columns: ['a', 'b', 'c', 'd', 'e'],
   *   prepValues: [
   *     [1, undefined, '3', undefined, 5],
   *     [1, 2, '3', undefined, undefined],
   *     [1, 2, '3', 4, 5]
   *   ]
   * }
   *
   * @param {Object|Array} data - insert data
   * @return {{columns: string[], prepValues: *[][]}}
   */
  _prepInsert (data) {
    let columns = []
    const prepValues = []

    if (!utils.isArray(data)) {
      data = data ? [data] : []
    }

    let i = -1
    while (++i < data.length) {
      if (data[i] == null) {
        break
      }
      if (i === 0) {
        columns = Object.keys(data[i]).sort()
      }
      const prepRow = new Array(columns.length)
      const keys = Object.keys(data[i])
      let j = -1
      while (++j < keys.length) {
        const key = keys[j]
        let index = columns.indexOf(key)
        if (index === -1) { // new column appears
          columns = columns.concat(key).sort()
          index = columns.indexOf(key)
          let k = -1
          while (++k < prepValues.length) { // update previous values
            prepValues[k].splice(index, 0, undefined)
          }
          prepRow.splice(index, 0, undefined)
        }
        prepRow[index] = this._parseValue(data[i][key])
      }
      prepValues.push(prepRow)
    }
    return {
      columns,
      prepValues
    }
  },

  /**
   * Prepare UPDATE data
   * @param {Object} data - update data
   * @return {string[]}
   */
  _prepUpdate (data) {
    const columns = Object.keys(data)
    const conditions = []
    let i = -1
    while (++i < columns.length) {
      const key = columns[i]
      const value = this._parseValue(data[key])
      conditions.push(`${key} = ${value}`)
    }
    if (conditions.length === 0) {
      throw new Error('Update data does not contain any values to update.')
    }
    return conditions
  }
})

/**
 * Details of the current version of the `js-data-saphana` module.
 *
 * @example
 * import { version } from 'js-data-saphana';
 * console.log(version.full);
 *
 * @name module: js-data-saphana.version
 * @type {object}
 * @property {string} version.full The full semver value.
 * @property {number} version.major The major version number.
 * @property {number} version.minor The minor version number.
 * @property {number} version.patch The patch version number.
 * @property {(string|boolean)} version.alpha The alpha version value,
 * otherwise `false` if the current version is not alpha.
 * @property {(string|boolean)} version.beta The beta version value,
 * otherwise `false` if the current version is not beta.
 */
export const version = '<%= version %>'

/**
 * {@link SapHanaAdapter} class.
 *
 * @example <caption>CommonJS</caption>
 * const SapHanaAdapter = require('js-data-saphana').SapHanaAdapter;
 * const adapter = new SapHanaAdapter();
 *
 * @example <caption>ES2015 Modules</caption>
 * import { SapHanaAdapter } from 'js-data-saphana';
 * const adapter = new SapHanaAdapter();
 *
 * @name module:js-data-saphana.SapHanaAdapter
 * @see SapHanaAdapter
 * @type {Constructor}
 */

/**
 * Registered as `js-data-saphana` in NPM.
 *
 * @example <caption>Install from NPM</caption>
 * npm i --save js-data-saphana js-data
 *
 * @example <caption>Load via CommonJS</caption>
 * const SapHanaAdapter = require('js-data-saphana').SapHanaAdapter;
 * const adapter = new SapHanaAdapter();
 *
 * @example <caption>Load via ES2015 Modules</caption>
 * import { SapHanaAdapter } from 'js-data-saphana';
 * const adapter = new SapHanaAdapter();
 *
 * @module js-data-saphana
 */
