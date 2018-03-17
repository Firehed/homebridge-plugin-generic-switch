/*
 * Expected config:
 *
 * {
 *   "platform": "GenericSwitch",
 *   "host": "http://your-switch.local",
 *   // Optional values
 *   "model": "model name",
 *   "manufacturer": "manufacturer name",
 *   "sn": "serial number",
 *   "cache": 15, // seconds
 *   "api": {
 *     "get": {
 *       "route": "/",
 *       "on": "on",
 *       "off": "off",
 *     },
 *     "set": {
 *       "route": "/power",
 *       "param": "state",
 *       "on": "on",
 *       "off": "off",
 *     }
 *   }
 * }
 */
var Accessory, Characteristic, Service, UUIDGen;

const platformName = 'generic-switch';
const platformPrettyName = 'GenericSwitch';
const fetch = require('node-fetch');

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerAccessory(platformName, platformPrettyName, GenericSwitch, true);
};

class GenericSwitch {

  // These values are provided via Homebridge
  constructor(log, config) {
    if (!config) {
      log('Ignoring switch - no config');
      return;
    }
    log('Generic switch plugin loaded');
    this.log = log;

    const { api, host, model, sn, manufacturer, cache } = config;
    this.host = host;
    this.model = model || 'Unknown';
    this.sn = sn || 'XXXXXX';
    this.manufacturer = manufacturer || 'Generic';
    this.api = api || {
      get: {
        route: "/",
        on: "on",
        off: "off",
      },
      set: {
        route: "/power",
        param: "state",
        on: "on",
        off: "off",
      },
    };

    // State caching variables: when the projector is changing state, it
    // reports the _current_ rather than the _target_ state. This will cache
    // the last known state (either from polling or toggling it) for 15s
    this.lastState = null
    this.lastChecked = null
    this.checkInterval = 1000 * (cache || 15); // milliseconds

    [this.infoService, this.switchService] = this.createServices();
  }

  createServices = () => {
    const infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.sn);

    const switchService = new Service.Switch(this.name);
    switchService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPower)
      .on('set', this.setPower);

    return [infoService, switchService];
  };

  getServices = () => {
    return [
      this.infoService,
      this.switchService,
    ];
  }

  getPower = (cb) => {
    if (this.lastChecked && this.lastChecked > (Date.now() - this.checkInterval)) {
      this.log.debug("Using cached power state");
      return cb(null, this.lastState);
    }

    fetch(this.host + this.api.get.route)
      .then(res => {
        if (!res.ok) {
          throw new Error(res.status + ' ' + res.statusText);
        }
        return res;
      })
      .then(res => res.text())
      .then(text => {
        let on;
        if (text === this.api.get.on) {
          on = true;
        } else if (text === this.api.get.off) {
          on = false;
        } else {
          this.log.error('Invalid response from get request: ', text);
          on = false;
        }

        this.lastState = on;
        this.lastChecked = Date.now();
        cb(null, on);
      });
  }

  setPower = (on, cb) => {
    const state = on ? this.api.set.on : this.api.set.off;
    // There's a weird interaction (pair of bugs) where this fetch wrapper
    // lowercases all of the HTTP header keys, and the ESP8266WebServer library
    // won't parse the POST body unless the Content-Length header is formatted
    // exactly as such. Fortunately, throwing the value in the query string
    // allows it to go through just fine.
    fetch(this.host + this.api.set.route + '?' + this.api.set.param + '=' + state, { method: "POST" })
      .then(_ => {
        this.lastState = on;
        this.lastChecked = Date.now();
        cb();
      });
  }

}
