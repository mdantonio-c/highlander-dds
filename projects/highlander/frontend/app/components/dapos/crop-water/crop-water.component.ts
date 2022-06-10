import { Component, Input } from "@angular/core";
import { DatasetInfo, CropWaterFilter, DateStruct } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";

import * as L from "leaflet";
import * as _ from "lodash";
import { DataService } from "../../../services/data.service";
import { ADMINISTRATIVE_AREAS, LAYERS, LEGEND_DATA } from "./data";
import { LegendConfig } from "../../../services/data";

const MAX_ZOOM = 16;
const MIN_ZOOM = 10;
const NORMAL_STYLE = {
  weight: 2,
  opacity: 0.9,
  color: "gray",
  fillOpacity: 0.9,
};
// FIXME
const WMS_ENDPOINT = "https://dds.highlander.cineca.it/geoserver/wms";

@Component({
  selector: "app-crop-water",
  templateUrl: "./crop-water.component.html",
  styleUrls: ["./crop-water.component.scss"],
})
export class CropWaterComponent {
  @Input()
  dataset: DatasetInfo;
  isFilterCollapsed = false;
  map: L.Map;
  private legends: { [key: string]: L.Control } = {};
  zoom: number = 12;
  center: L.LatLng = L.latLng([44.49895, 11.32759]); // default Bologna City
  readonly LEGEND_POSITION = "bottomright";
  availableRuns: DateStruct[]; // = AVAILABLE_RUNS;
  selectedPeriod: DateStruct;

  LAYER_OSM = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Open Street Map</a> ',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    }
  );
  options = {
    layers: [this.LAYER_OSM],
    zoom: this.zoom,
    fullscreenControl: true,
    center: this.center,
  };

  // layers: L.Layer[] = [this.LAYER_OSM];
  filter: CropWaterFilter;
  private geoData: L.LayerGroup = new L.LayerGroup();
  // referenceDate: string = "2021-07-07";

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService
  ) {}

  onMapReady(map: L.Map) {
    this.map = map;
    // position to selected area
    this.map.setView(this.center, this.zoom);

    this.initLegends(map);
    // add a legend
    if (this.legends[this.filter.layer]) {
      this.legends[this.filter.layer].addTo(map);
    }
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
    this.zoom = this.map.getZoom();
  }

  onMapMove($event) {
    this.center = this.map.getCenter();
  }

  private initLegends(map: L.Map) {
    LAYERS.forEach((l) => {
      this.legends[l.code] = this.createLegendControl(l.code);
      console.log(`add legend <${l.code}>`);
    });
  }

  private createLegendControl(id: string): L.Control {
    let config: LegendConfig = LEGEND_DATA.find((x) => x.id === id);
    if (!config) {
      console.error(`Legend data NOT found for ID<${id}>`);
      this.notify.showError("Bad legend configuration");
      return;
    }
    const legend = new L.Control({ position: this.LEGEND_POSITION });
    legend.onAdd = () => {
      let div = L.DomUtil.create("div", config.legend_type);
      if (!L.Browser.touch) {
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.on(div, "mousewheel", L.DomEvent.stopPropagation);
      } else {
        L.DomEvent.on(div, "click", L.DomEvent.stopPropagation);
      }

      div.innerHTML += `<h6>${config.title}</h6>`;
      for (let i = 0; i < config.labels.length; i++) {
        div.innerHTML +=
          '<i style="background:' +
          config.colors[i] +
          '"></i><span>' +
          config.labels[i] +
          "</span><br>";
      }
      return div;
    };
    return legend;
  }

  async applyFilter(data: CropWaterFilter) {
    const previousLayer = this.filter?.layer || null;
    this.filter = data;

    // need to wait for the available runs to load
    if (!this.availableRuns) {
      await this.dataService
        .getRunPeriods("crop-water", "crop-water")
        .toPromise()
        .then((periods) => (this.availableRuns = periods));
    }

    if (!this.selectedPeriod) {
      // default to the last run
      data.period = this.availableRuns[0];
      this.selectedPeriod = data.period;
    } else {
      data.period = this.selectedPeriod;
    }

    console.log("apply filter", this.filter);
    const selectedArea = ADMINISTRATIVE_AREAS.find((x) => x.code === data.area);
    this.zoom = selectedArea.zLevel ? selectedArea.zLevel : this.zoom;
    this.center = selectedArea.coords;

    if (this.map) {
      // change area
      this.map.setView(this.center, this.zoom);

      this.loadGeoData();

      if (previousLayer && data.layer !== previousLayer) {
        // remove the previous legend
        this.map.removeControl(this.legends[previousLayer]);
        // add the new legend
        this.legends[data.layer].addTo(this.map);
      }
    }
  }

  /**
   * Load geo data on the map
   */
  private loadGeoData() {
    if (!this.map) {
      console.warn("Cannot load geo data. Map not available");
      return;
    }
    console.log(`loading geo data... area <${this.filter.area}>`);

    // first clean up the map from the existing overlays
    this.map.removeLayer(this.geoData);
    this.geoData.clearLayers();
    const percentile: string = this.filter.percentile
      ? String(this.filter.percentile).padStart(2, "0")
      : "";
    let myLayer = L.tileLayer.wms(`${WMS_ENDPOINT}`, {
      // wms layer in form of: {area}_{YYYY-MM-DD}_{layer}{percentile}
      layers: `highlander:${this.filter.area}_${this.periodToString(
        this.filter.period
      )}_${this.filter.layer}${percentile}`,
      version: "1.1.0",
      format: "image/png",
      opacity: 0.8,
      transparent: true,
      attribution: "'&copy; Arpae",
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    });
    myLayer.on("tileerror", (error) => {
      this.notify.showWarning("No data layer available.");
    });
    this.geoData.addLayer(myLayer);
    this.geoData.addTo(this.map);
  }

  printLayerDescription(): string {
    const code = this.filter.layer;
    const found = LAYERS.find((x) => x.code === code);
    return found.label || code;
  }

  onPeriodChange(val) {
    console.log("period changed", val);
    this.filter.period = val;
    this.applyFilter(this.filter);
  }

  isSamePeriod(a: DateStruct, b: DateStruct) {
    return _.isEqual(a, b);
  }

  periodToString(p: DateStruct): string {
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(
      p.day
    ).padStart(2, "0")}`;
  }
}
