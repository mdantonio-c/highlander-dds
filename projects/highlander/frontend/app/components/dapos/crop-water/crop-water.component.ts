import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo, CropWaterFilter } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";

import * as L from "leaflet";
import { DataService } from "../../../services/data.service";
import { ADMINISTRATIVE_AREAS } from "./data";

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

  zoom: number = 12;
  center: L.LatLng = L.latLng([44.49895, 11.32759]); // default Bologna City

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
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
    this.zoom = this.map.getZoom();
  }

  onMapMove($event) {
    this.center = this.map.getCenter();
  }

  applyFilter(data: CropWaterFilter) {
    console.log("apply filter", data);
    this.filter = data;

    const selectedArea = ADMINISTRATIVE_AREAS.find((x) => x.code === data.area);
    this.zoom = selectedArea.zLevel ? selectedArea.zLevel : this.zoom;
    this.center = selectedArea.coords;

    if (this.map) {
      // change area
      console.log(`change zoom to ${this.zoom}`);
      this.map.setView(this.center, this.zoom);

      this.loadGeoData();
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
    // const months: string = "MJJ";
    // const layerType: string = "IRRIGATION";
    console.log(
      `highlander:${this.filter.layer}_${this.filter.area}_${year}_${month}_${day}`
    );

    let myLayer = L.tileLayer.wms(`${WMS_ENDPOINT}`, {
      layers: `highlander:${this.filter.layer}_${this.filter.area}_${year}_${month}_${day}`,
      version: "1.1.0",
      format: "image/png",
      opacity: 0.5,
      transparent: true,
      attribution: "'&copy; CMCC",
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    });
    this.geoData.addLayer(myLayer);
  }
}
