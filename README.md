<img src="https://raw.githubusercontent.com/js-data/js-data/master/js-data.png" alt="js-data logo" title="js-data" align="right" width="96" height="96" />

# js-data-saphana

[![Slack][1]][2]

A SAP Hana adapter for the [JSData Node.js ORM][3].

### Installation

    npm install --save js-data js-data-saphana

### Usage

```js
import { SapHanaAdapter } from 'js-data-saphana';

// Create an instance of SapHanaAdapter
const adapter = new SapHanaAdapter({
  hanaOpts: {
    host: '127.0.0.1',
    port: 0,
    uid: 'root',
    pwd: 'test'
  }
});

// Other JSData setup hidden

// Register the adapter instance
store.registerAdapter('adapter', adapter, { default: true });
```

### JSData + SQL Tutorial

Start with the [JSData][4].

### License

[The MIT License (MIT)][5]

Copyright (c) 2014-2021 [js-data-saphana project authors][6]

[1]: http://slack.js-data.io/badge.svg
[2]: http://slack.js-data.io
[3]: http://www.js-data.io/
[4]: http://www.js-data.io/docs/home
[5]: https://github.com/kvandelden/js-data-saphana/blob/master/LICENSE
[6]: https://github.com/kvandelden/js-data-saphana/blob/master/AUTHORS
