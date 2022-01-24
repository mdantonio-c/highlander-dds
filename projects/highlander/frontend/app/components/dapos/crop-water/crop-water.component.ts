import { Component, OnInit, Input } from "@angular/core";
import { DatasetInfo, CropWaterFilter } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";

import * as L from "leaflet";
import { DataService } from "../../../services/data.service";
import { ADMINISTRATIVE_AREAS } from "./data";

const MAX_ZOOM = 16;
const MIN_ZOOM = 10;

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
    center: L.latLng([44.5, 11.33]),
  };

  layers: L.Layer[] = [this.LAYER_OSM];
  private filter: CropWaterFilter;

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService
  ) {}

  ngOnInit() {}

  onMapReady(map: L.Map) {
    this.map = map;
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
    this.zoom = this.map.getZoom();
  }

  applyFilter(data: CropWaterFilter) {
    console.log("apply filter", data);
    this.filter = data;

    // change area
    if (this.map) {
      const selectedArea = ADMINISTRATIVE_AREAS.find(
        (x) => x.code === data.area
      );
      const z = selectedArea.zLevel ? selectedArea.zLevel : this.zoom;
      this.zoom = z;
      // console.log(`change zoom to ${z}`);
      this.map.setView(selectedArea.coords, z);
    }
  }
}
