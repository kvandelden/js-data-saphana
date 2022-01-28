import {
  Container,
  DataStore,
  Schema
} from 'js-data'
import {
  SapHanaAdapter
} from '../dist/js-data-saphana'

const DEFAULT_ADAPTER_CONFIG = {
  hanaOpts: {
    host: '127.0.0.1',
    port: 0,
    uid: 'root',
    pwd: 'test'
  }
}

const DEFAULT_CONTAINER_CONFIG = {
  mapperDefaults: {
    debug: false
  }
}

const DEFAULT_STORE_CONFIG = {
  mapperDefaults: {
    debug: false
  }
}

/**
 * Create a container, store, adapter and a schema for testing.
 * @param {Object} [options]
 * @param {Object} [options.adapterConfig] - config passed to SapHanaAdapter
 * @param {Object} [options.containerConfig] - config passed to Container
 * @param {Object} [options.storeConfig] - config passed to DataStore
 * @return {{container: Container, adapter: SapHanaAdapter, store: DataStore}}
 */
export function initTest (options) {
  options || (options = {})
  const adapter = new SapHanaAdapter(options.adapterConfig || DEFAULT_ADAPTER_CONFIG)
  const container = new Container(options.containerConfig || DEFAULT_CONTAINER_CONFIG)
  const store = new DataStore(options.storeConfig || DEFAULT_STORE_CONFIG)

  container.registerAdapter('adapter', adapter, { 'default': true })
  store.registerAdapter('adapter', adapter, { 'default': true })

  const schema = new Schema({
    $schema: 'http://json-schema.org/draft-04/schema#', // optional
    title: 'Jobs',
    description: 'Schema for Jobs records', // optional
    type: 'object',
    track: true,
    options: {
      hdb: {
        table: "/AZR/WB_QUEUE"
      }
    },
    properties: {
      WB_QUEUE_ID: { type: 'number' },
      QUEUE_ID: { type: 'string' },
      ITEM_TYPE: { type: 'string' },
      ITEM_WB_ID: { type: 'number' },
      CREATED_DTTS: { type: 'number' },
      PROCESS_STATUS: { type: 'string' },
      WB_JOB_ID: { type: 'number' },
      WB_JOBPROCESSOR_ID: { type: 'number' },
      PROCESS_START_DTTS: { type: 'number' },
      PROCESS_END_DTTS: { type: 'number' },
      MESSAGE: { type: 'string' }
    }
  })
  store.defineMapper(MAPPER_WB_QUEUE, {
    name: MAPPER_WB_QUEUE,
    table: '/AZR/WB_QUEUE',
    idAttribute: 'WB_QUEUE_ID',
    schema: schema
  })
  return {
    adapter,
    container,
    store
  }
}

export const MAPPER_WB_QUEUE = 'WB_Queue'
