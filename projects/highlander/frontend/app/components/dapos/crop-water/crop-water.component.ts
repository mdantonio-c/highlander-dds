import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo, CropWaterFilter } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";

import * as L from "leaflet";
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
const WMS_ENDPOINT = "https://dds.highlander.cineca.it/geoserver/wms"; // FIXME

@Component({
  selector: "app-crop-water",
  templateUrl: "./crop-water.component.html",
  styleUrls: ["./crop-water.component.scss"],
})
export class CropWaterComponent implements OnInit {
  @Input()
  dataset: DatasetInfo;
  isFilterCollapsed = false;
  private collapsed = false;
  map: L.Map;
  private legends: { [key: string]: L.Control } = {};
  zoom: number = 12;
  center: L.LatLng = L.latLng([44.49895, 11.32759]); // default Bologna City
  readonly LEGEND_POSITION = "bottomleft";

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

  layers: L.Layer[] = [this.LAYER_OSM];
  public filter: CropWaterFilter;
  private geoData: L.LayerGroup = new L.LayerGroup();
  referenceDate: string = "2021-07-07";

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService
  ) {}

  ngOnInit() {}

  onMapReady(map: L.Map) {
    this.map = map;
    // posizion to selected area
    this.map.setView(this.center, this.zoom);

    // load geo data
    console.log("load geo data");
    this.loadGeoData();

    this.geoData.addTo(map);
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
      div.style.clear = "unset";
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

  applyFilter(data: CropWaterFilter) {
    console.log("apply filter", data);

    const selectedArea = ADMINISTRATIVE_AREAS.find((x) => x.code === data.area);
    this.zoom = selectedArea.zLevel ? selectedArea.zLevel : this.zoom;
    this.center = selectedArea.coords;

    if (this.map) {
      // change area
      this.map.setView(this.center, this.zoom);

      this.loadGeoData();

      if (data.layer !== this.filter.layer) {
        // remove the previous legend
        this.map.removeControl(this.legends[this.filter.layer]);
        // add the new legend
        this.legends[data.layer].addTo(this.map);
      }
    }

    this.filter = data;
  }

  /**
   * Load geo data on the map
   */
  private loadGeoData() {
    if (!this.map) {
      console.warn("Cannot load geo data. Map not available");
      return;
    }
    this.geoData.clearLayers();
    /*this.dataService
      .getCropWaterForecasts()
      .subscribe((json) => {
        const jsonLayer = L.geoJSON(json, {
          style: NORMAL_STYLE
        });
        this.geoData.addLayer(L.geoJSON(json));
      });*/

    const year: number = 2021,
      month: string = "07",
      day: string = "07";

    let myLayer = L.tileLayer.wms(`${WMS_ENDPOINT}`, {
      layers: `highlander:${this.filter.layer.toUpperCase()}_${
        this.filter.area
      }_${year}_${month}_${day}`,
      version: "1.1.0",
      format: "image/png",
      opacity: 0.8,
      transparent: true,
      attribution: "'&copy; CMCC",
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    });
    this.geoData.addLayer(myLayer);
  }

  printLayerDescription(code: string): string {
    const found = LAYERS.find((x) => x.code === code);
    return found.label || code;
  }
}
