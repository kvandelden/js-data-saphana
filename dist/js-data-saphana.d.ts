import {Adapter} from 'js-data-adapter'

interface IDict {
    [key: string]: any;
}
interface IBaseAdapter extends IDict {
    debug?: boolean,
    raw?: boolean
}
interface IBaseSapHanaAdapter extends IBaseAdapter {
    hanaOpts?: IDict
    poolOpts?: IDict
    customGetTable?: Function
}
export class SapHanaAdapter extends Adapter {
    static extend(instanceProps?: IDict, classProps?: IDict): typeof SapHanaAdapter
    static dctConnectionPool: {
        [connectionSettingHashKey: string]: any
    }
    constructor(opts?: IBaseSapHanaAdapter)
}
export interface OPERATORS {
    '=': string
    '==': string
    'EQ': string
    '<>': string
    '!=': string
    'NEQ': string
    '>': string
    'GT': string
    '>=': string
    'GTE': string
    '<': string
    'LT': string
    '<=': string
    'LTE': string
    'IN': string
    'INQ': string
    'NOTIN': string
    'NIN': string
    'LIKE': string
    'NLIKE': string
    'ILIKE': string
    'LIKEI': string
}
export interface version {
    full: string
    minor: string
    major: string
    patch: string
    alpha: string | boolean
    beta: string | boolean
}
