# Custom Nostr Event Kinds

This document describes the custom Nostr event kinds used by this weather station application. These kinds are based on the draft NIP proposal at https://github.com/nostr-protocol/nips/pull/2163.

## Event Kinds

### `kind:16158` - Weather Station Metadata (Replaceable)

A replaceable event describing a weather station's configuration and capabilities. Since this kind is in the replaceable range (10000-19999), there is one metadata event per pubkey. Each weather station should have its own Nostr keypair/identity.

**Example:**

```json
{
  "kind": 16158,
  "pubkey": "<station-pubkey>",
  "tags": [
    ["name", "Backyard Station"],
    ["description", "Home weather station in the garden"],
    ["g", "9q5h"],
    ["elevation", "52"],
    ["power", "mains"],
    ["connectivity", "wifi"],
    ["sensor", "temp", "DHT11"],
    ["sensor", "humidity", "DHT11"],
    ["sensor", "pm25", "PMS5003"],
    ["sensor_status", "temp", "DHT11", "ok"],
    ["sensor_status", "humidity", "DHT11", "ok"],
    ["sensor_status", "pm25", "PMS5003", "ok"],
    ["alt", "Weather station metadata for Backyard Station at geohash 9q5h"]
  ],
  "content": "",
  "created_at": 1234567890,
  "id": "...",
  "sig": "..."
}
```

**Tags:**

- `name` (optional): Human-readable station name
- `description` (optional): Brief description of the station
- `g` (optional): Geohash for location indexing (see NIP-52)
- `elevation` (optional): Elevation in meters above sea level
- `power` (optional): Power source type (e.g., `mains`, `solar`, `battery`, `solar_battery`, `usb`)
- `connectivity` (optional): Connectivity type (e.g., `wifi`, `cellular`, `ethernet`, `lora`, `satellite`)
- `sensor` (repeatable): Sensor types available with model identifier. Format: `["sensor", "<type>", "<model>"]`
- `sensor_status` (repeatable): Current sensor status. Format: `["sensor_status", "<sensor_type>", "<model>", "<status>"]` where status is `"ok"` or `"418"` (sensor not returning valid data)
- `alt` (required): Human-readable description per NIP-31 for clients that don't understand weather events

**Security Note:** Only query by `authors` when displaying "your stations" or trusted station lists. For public discovery, query by `kind` and optionally filter by `#g` (geohash).

---

### `kind:4223` - Weather Station Readings (Regular)

Regular events containing sensor readings. Since this kind is in the regular range (1000-9999), all readings are stored permanently by relays, enabling historical queries (e.g., last hour, last day).

Sensor readings use 3-parameter tags: `[sensor_type, value, model]`. The third parameter identifies the sensor model, enabling cross-station comparison and supporting multi-sensor setups where the same sensor type may use different models.

Include a reading tag only when the sensor produced a valid value; otherwise omit (no null or default values).

**Example:**

```json
{
  "kind": 4223,
  "pubkey": "<station-pubkey>",
  "tags": [
    ["temp", "22.5", "DHT11"],
    ["humidity", "65.2", "DHT11"],
    ["pm1", "8", "PMS5003"],
    ["pm25", "12", "PMS5003"],
    ["pm10", "15", "PMS5003"],
    ["air_quality", "627", "MQ-135"],
    ["alt", "Weather reading: 22.5°C, 65.2% humidity, PM2.5: 12"]
  ],
  "content": "",
  "created_at": 1234567890,
  "id": "...",
  "sig": "..."
}
```

**Tags:**

- Sensor reading tags (repeatable, 3-parameter format `[sensor_type, value, model]`). See sensor types below.
- `alt` (required): Human-readable summary per NIP-31

**Supported Sensor Types:**

| sensor_type | Example Models | Description |
|-------------|----------------|-------------|
| `temp` | DHT11, DHT22, BME280 | Temperature in degrees Celsius |
| `humidity` | DHT11, DHT22, BME280 | Relative humidity percentage |
| `pm1` | PMS5003, PMS7003, SPS30, SDS011 | Particulate matter 1.0 µm (µg/m³) |
| `pm25` | PMS5003, PMS7003, SPS30, SDS011 | Particulate matter 2.5 µm (µg/m³) |
| `pm10` | PMS5003, PMS7003, SPS30, SDS011 | Particulate matter 10 µm (µg/m³) |
| `air_quality` | MQ-135 | Air quality index (sensor-specific units) |
| `light` | BH1750 | Light intensity in lux |
| `co2` | MH-Z19, SGP30 | CO₂ concentration in ppm |
| `gas` | SGP30 | Total volatile organic compounds (TVOC) in ppb |
| `carbon_monoxide` | MQ-7 | CO concentration in ppm |
| `pressure` | BME280, BME680 | Atmospheric pressure in hPa |
| `rain` | MH-RD | Rain detection (boolean or mm) |

Additional sensor types can be added as needed. The third parameter (model) is always required to enable cross-station comparison and quality control.

---

### `kind:36643` - Weather Station Lists (Addressable)

User-curated lists of weather stations following the NIP-51 set format. Uses `p` tags to reference station pubkeys. Each list is identified by a unique `d` tag, allowing users to create multiple lists (e.g., "my-home-stations", "urban-stations", "favorites").

**Example:**

```json
{
  "kind": 36643,
  "pubkey": "<user-pubkey>",
  "tags": [
    ["d", "my-home-stations"],
    ["title", "My Home Weather Stations"],
    ["description", "Weather stations I've deployed around my property"],
    ["p", "<station1-pubkey>"],
    ["p", "<station2-pubkey>"],
    ["p", "<station3-pubkey>"],
    ["alt", "Weather station list: My Home Weather Stations (3 stations)"]
  ],
  "content": "",
  "created_at": 1234567890,
  "id": "...",
  "sig": "..."
}
```

**Tags:**

- `d` (required): Unique identifier for this list (addressable event identifier)
- `title` (optional): Human-readable list name
- `description` (optional): Brief description of the list
- `p` (repeatable): Station pubkeys included in this list
- `alt` (required): Human-readable description per NIP-31

**Security Note:** Always filter by `authors` when querying station lists. The `d` tag alone is not a trust boundary — anyone can publish a list with any `d` value. Only lists published by the logged-in user or explicitly trusted pubkeys should be displayed.

**Query Example:**

```typescript
// Get a user's station lists
nostr.query([{
  kinds: [36643],
  authors: [userPubkey]
}]);

// Get a specific list by d-tag (MUST include authors filter)
nostr.query([{
  kinds: [36643],
  authors: [userPubkey],
  '#d': ['my-home-stations']
}]);
```

---

## Discovery

Clients can discover weather data by querying for the event kinds defined above:

**Find all weather stations:**
```typescript
nostr.query([{ kinds: [16158], limit: 100 }]);
```

**Find weather stations near a location (geohash):**
```typescript
nostr.query([{ kinds: [16158], '#g': ['9q5h'], limit: 50 }]);
```

**Get recent readings from a specific station:**
```typescript
nostr.query([{ 
  kinds: [4223], 
  authors: [stationPubkey],
  limit: 20
}]);
```

**Get readings from the last hour:**
```typescript
const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
nostr.query([{ 
  kinds: [4223], 
  authors: [stationPubkey],
  since: oneHourAgo
}]);
```

---

## Reference Implementation

- ESP32/ESP8266 weather station firmware: https://github.com/samthomson/weather-station
- Web client: This application

---

## Related NIPs

- **NIP-01**: Basic protocol flow
- **NIP-31**: `alt` tag for unknown event kinds
- **NIP-51**: Lists and sets (basis for kind:36643)
- **NIP-52**: Geohash tags for location indexing
