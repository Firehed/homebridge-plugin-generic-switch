# homebridge-plugin-generic-switch

Homekit connectivity for (almost) any network-connected switch.

Designed to work in combination with lightweight networked devices such as an ESP-8266.

## How it works

This creates a Homebridge switch accessory, which is linked to the configured device.
When the power state is requested, it will send a GET request and process the response, formatting it for Homekit.
Similarly, when the state is changed, it will send a POST request to the device.

## Installation

Assuming you already have Homebridge running somewhere, just install this plugin like you would with any other: `npm i -g homebridge-plugin-generic-switch`.

If you don't have Homebridge set up with at least one other device, it's probably best to not start with this one.
While this plugin should work with very little work or configuration, the hardware side has a decent chance of being quite fiddly and you won't want to deal with that _in addition to_ getting Homebridge up and running.

## Configuration

In your existing Homebridge configration, add an accessory with, at minimum, the following structure:

```json
"accessories": [
    {
        "accessory": "GenericSwitch",
        "host": "http://your-switch.local",
        "name": "Some Switch Name",
    }
]
```
Make sure that the `host` field includes the protocol.

For further customization, all of the following parameters can be set (with their default values shown below):

```json
"accessories": [
    {
        "accessory": "GenericSwitch",
        "host": "http://your-switch.local",
        "name": "Some Switch Name",
        "model": "Unknown",
        "manufacturer": "Generic",
        "sn": "XXXXXX",
        "cache":  15,
        "api": {
            "get": {
                "route": "/",
                "on": "on",
                "off": "off"
            },
            "set": {
                "route": "/power",
                "param": "state",
                "on": "on",
                "off": "off"
            }
        }
    }
]
```

The `model`, `manufacturer`, and `sn` fields are for display purposes only.

`cache` is the duration (in seconds) that a response from the device should be cached.
This is meant primarily for devices that are slow to change their power state, such as projectors (which have warm-up and cool-down times).
Set to `0` to disable, but this is not recommended if using an ESP8266-based device since its webserver doesn't support requests in parallel.

The `api` structure configures what requests will be sent when the state is set or retreived.

### Default API
The default configuration indicates the following:

#### Retreive power
`GET /` - expects to receive a `text/plain` response containing `on` or `off`.
If another value is received, the state will default to off and an error will be logged.

#### Set power
`POST /power?state={on|off}` - the response is ignored.
Note that due to a weird interaction between how `node-fetch` and the `ESP8266WebServer` libraries work, what normally would go in the POST body is instead sent as a query parameter.
This is hardcoded for now, but may become configurable in the future.

## Contributing

Send a pull request or open an issue.

## License

MIT
