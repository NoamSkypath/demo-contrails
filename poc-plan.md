# Contrails API POC Plan

## Overview

A minimal, clean demo app to showcase the capabilities of the Contrails API by rendering contrail region data on a Mapbox map. The app allows dynamic API requests with filters and displays feature metadata in tooltips.

**Initial version will use the `getRegions` method, but the codebase and structure will be designed for easy extension to support the `getGrids` method in the future.**

---

## getRegions API: Request & Response

### Request

- **Endpoint:** `GET https://contrails.googleapis.com/v2/regions`
- **Query Parameters:**
  - `key` (string, required): API key
  - `time` (string, required): Time of request (ISO 8601 or Unix epoch)
  - `flightLevel[]` (integer, optional): Flight levels in hectofeet (270–440)
  - `threshold` (integer, optional): Minimum severity level (1–4)
  - `aircraftClass` (string, optional): Aircraft class (currently only 'default' is supported)

### Example Request

```
GET https://contrails.googleapis.com/v2/regions?key=<api-key>&time=2025-06-20T00:00:00&flightLevel=290&threshold=2
```

### Response Schema

- Returns a GeoJSON `FeatureCollection`:

```
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "time": "<ISO 8601 datetime>",
        "flightLevel": <int>,
        "threshold": <int>,
        "forecast_reference_time": "<ISO 8601 datetime>",
        "aircraft_class": "default"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      }
    }
  ]
}
```

- **Notes:**
  - `flightLevel` is in hectofeet (270–440)
  - `threshold` is severity (1–4, higher is more severe)
  - `geometry` is a GeoJSON MultiPolygon

---

## getGrids API: Request & Response (Planned for v2)

### Request

- **Endpoint:** `GET https://contrails.googleapis.com/v2/{name=grids}`
- **Path Parameters:**
  - `name` (string, required): The name of the grid to retrieve. Format: `grid/{grid_type}` (currently only `ef` is supported)
- **Query Parameters:**
  - `key` (string, required): API key
  - `bbox[]` (number, optional): Boundaries of region to return, (lng_min, lat_min, lng_max, lat_max)
  - `time` (string, required): Time of request (ISO 8601 or Unix epoch)
  - `aircraftType` (string, optional): 4-character aircraft code (e.g., A320)
  - `flightLevel[]` (integer, optional): Flight levels to return
  - `format` (string, optional): Requested format (only `netcdf4` is supported for now)
  - `aircraftClass` (string, optional): Aircraft class (currently only 'default' is supported)

### Example Request

```
GET https://contrails.googleapis.com/v2/grid/ef?key=<api-key>&time=2025-06-20T00:00:00&bbox=-10,30,10,50&flightLevel=300&format=netcdf4
```

### Response Schema

- Returns a NetCDF4 file containing contrail forcing values.
- **Notes:**
  - The NetCDF contains multi-dimensional data (longitude, latitude, flight_level, time, etc.)
  - Not directly renderable as GeoJSON; will require parsing and transformation for visualization.
  - For more details, see the [Contrails API documentation](https://developers.google.com/contrails/reference/rest/v2/TopLevel/getGrids).

---

## getGrids UI & Integration Plan

- Add a floating toggle button (top center, above the map) to switch between "Region" and "Grid" mode.
- When in "Grid" mode:
  - Sidebar shows relevant filters (bbox, aircraftType, format, etc.).
  - On filter change, call getGrids and handle the NetCDF response.
  - For MVP: show a message or download link for the NetCDF file.
  - Plan for future: parse NetCDF and render as raster or contours on the map.

---

## Folder Structure (updated)

```
contrails-poc/
├── src/
│   ├── app.tsx                # App shell and layout
│   ├── map-view.tsx           # Mapbox map and GeoJSON/NetCDF rendering
│   ├── sidebar.tsx            # Sidebar with filters and mode toggle
│   ├── feature-tooltip.tsx    # Tooltip for feature metadata
│   ├── api/
│   │   ├── index.ts           # API client entry point, method selection abstraction
│   │   ├── regions.ts         # getRegions API logic
│   │   └── grids.ts           # getGrids API logic
│   ├── types.ts               # TypeScript types (shared for both regions and grids)
│   └── styles.css             # Minimal CSS
├── public/
│   └── index.html
├── .env.example               # Example environment variables (API key, Mapbox token)
├── poc-plan.md                # This plan
├── package.json
└── ... (Vite/CRA config files)
```

---

## Features (updated)

- Dynamic API request with API key and filters (time required, others optional)
- Mapbox map rendering of GeoJSON MultiPolygon features (from getRegions)
- **Floating toggle button to switch between Region and Grid mode**
- Severity-based coloring (white → red, blue, or black scale)
- Sidebar with filter controls and mode toggle
- Tooltip with feature metadata (flight_level, threshold, time, forecast_reference_time, aircraft_class)
- Loading and error states
- Minimal, clean UI
- **Grid mode: NetCDF download or message, plan for future visualization**
- **Extensible structure for future getGrids support**

---

## Design for Extensibility

- **API Layer**: Abstract API client to support both `getRegions` and `getGrids` methods. Use a method selector or strategy pattern in the API client.
- **Types**: Centralize shared types (e.g., filters, API response shapes) to support both endpoints.
- **UI**: Sidebar and map components should be flexible to handle both region (GeoJSON) and grid (NetCDF or other) data in the future.
- **Feature Toggle**: Consider a simple toggle or config to switch between region and grid modes (for v2).

---

## Request Metadata Tracking

For each API request, track and display:

- HTTP status code
- Request size (bytes)
- Response size (bytes)
- Request duration (ms)
- The generated request URL (with filters applied)
- **Feature stats:**
  - Number of features (GeoJSON count)
  - Distinct list of flight levels
  - Distinct list of aircraft classes
  - Min/max of forecast_reference_time
  - Min/max of time

This metadata is shown in the sidebar for transparency and debugging.

---

## UI Polish & Filter UX Improvements

- Sidebar uses a compact, dark theme with high-contrast, readable labels and headings.
- Filter controls are compact, modern, and easy to scan.
- Filters auto-apply on blur (inputs) or change (selects); no Apply button.
- Filter state is local and never resets after a request.
- Form submission (Enter key) is prevented from clearing filters.
- Debug logging shows the exact filters sent to the API.
- Metadata and feature stats are clearly displayed in the sidebar.

---

## Steps to Implement

1. Bootstrap project (Vite + React + TypeScript) **[Done]**
2. Integrate Mapbox and render the base map (`map-view.tsx`) **[Done]**
3. Implement sidebar with filter controls (no API key input; API key is handled via .env) **[Done]**
4. Build API client for dynamic requests (start with regions, abstract for future grids) **[Done]**
   - Sidebar triggers the API request on "Apply Filters"; request is visible in the network tab and console.
5. Render GeoJSON features on the map **[Done]**
6. Implement severity-based coloring for polygons **[Done]**
7. Add tooltip for feature metadata **[Done]**
   - Tooltip shows flight level, threshold, time, forecast reference time, and aircraft class.
   - Time filter only allows full hours and auto-corrects user input to the next full hour.
8. Handle loading, errors, and empty states **[Done]**
9. Polish UI for minimal, clean look and pro filter UX **[Done]**
10. **Prepare stubs and structure for getGrids support (v2)**
11. **Track and display request metadata and feature stats in the sidebar (status code, request/response size, duration, URL, feature count, distinct flight levels, aircraft classes, min/max times)** **[Done]**
12. **Implement getGrids support:**
    - Add floating mode toggle button (Region/Grid)
    - Implement getGrids API client and UI logic
    - Show NetCDF download/message in Grid mode
    - (Future) Parse and visualize NetCDF on the map

---

## TODO

- [x] Bootstrap project with Vite + React + TypeScript
- [x] Integrate Mapbox and render the base map (`map-view.tsx`)
- [x] Set up folder structure as above
- [x] Implement `sidebar.tsx` with all filter controls (no API key input)
- [x] Create `api/regions.ts` for getRegions API requests
- [x] Create `api/index.ts` with abstraction for future method selection
- [x] (Stub) Create `api/grids.ts` for getGrids API logic (to be implemented in v2)
- [x] Wire up sidebar to trigger API request on filter apply
- [x] Render GeoJSON features on the map
- [x] Implement severity-based coloring logic
- [x] Add `feature-tooltip.tsx` for metadata display
- [x] Add loading and error handling
- [x] Style app for minimal, clean appearance
- [x] Test with real API data
- [x] Polish UI for minimal, clean look and pro filter UX
- [x] Track and display request metadata and feature stats in the sidebar
- [ ] **Prepare UI and types for easy extension to getGrids**
- [ ] Add floating mode toggle button (Region/Grid)
- [ ] Implement getGrids API client and UI logic
- [ ] Show NetCDF download/message in Grid mode
- [ ] (Future) Parse and visualize NetCDF on the map
- [ ] Improve the filter UI (future enhancements)
