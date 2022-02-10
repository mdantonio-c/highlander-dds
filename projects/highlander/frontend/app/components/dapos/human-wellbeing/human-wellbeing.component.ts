import { Component, OnInit, Input, HostListener } from "@angular/core";
import { User } from "@rapydo/types";
import { NgxSpinnerService } from "ngx-spinner";
import { SSRService } from "@rapydo/services/ssr";
import { DatasetInfo, HumanWellbeingFilter } from "../../../types";

import * as L from "leaflet";
import "leaflet-timedimension/dist/leaflet.timedimension.src.js";
/*declare module "leaflet" {
  let timeDimension: any;
}*/

const MAX_ZOOM = 8;
const MIN_ZOOM = 5;

@Component({
  selector: "app-human-wellbeing",
  templateUrl: "./human-wellbeing.component.html",
  styleUrls: ["./human-wellbeing.component.scss"],
})
export class HumanWellbeingComponent implements OnInit {
  @Input()
  dataset: DatasetInfo;
  user: User;
  loading = false;
  isFilterCollapsed = false;
  private collapsed = false;
  map: L.Map;
  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));

  LAYER_OSM = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Open Street Map</a> ',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    }
  );

  layers: L.Layer[] = [this.LAYER_OSM];
  layersControl = {
    baseLayers: {},
    overlays: null,
  };
  layersControlOptions = {
    collapsed: false,
  };
  mLayers = L.layerGroup([]);

  options = {
    layers: [this.LAYER_OSM],
    zoom: 6,
    fullscreenControl: true,
    center: L.latLng([42.0, 13.0]),
    timeDimension: false,
    timeDimensionControl: false,
    // maxBounds: this.bounds,
    maxBoundsViscosity: 1.0,
    //bounds:
    timeDimensionControlOptions: {
      autoPlay: false,
      loopButton: true,
      timeSteps: 1,
      playReverseButton: true,
      limitSliders: true,
      playerOptions: {
        buffer: 0,
        transitionTime: 500,
        loop: true,
      },
    },
  };

  private filter: HumanWellbeingFilter;

  isPanelCollapsed: boolean = true;

  constructor(protected spinner: NgxSpinnerService, private ssr: SSRService) {}

  ngOnInit() {
    if (this.ssr.isBrowser) {
      this.setCollapse(window.innerWidth);
    }
  }

  onMapReady(map: L.Map) {
    this.map = map;
    setTimeout(function () {
      map.invalidateSize();
    }, 200);
  }

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
  }

  applyFilter(data: HumanWellbeingFilter) {
    console.log("apply filter", data);
  }

  closeDetails() {
    this.isPanelCollapsed = true;
    this.map.setView(L.latLng([42.0, 13.0]), 6);
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
  }

  toggleCollapse() {
    this.isFilterCollapsed = !this.isFilterCollapsed;
  }

  private setCollapse(width: number) {
    if (width < 991.98) {
      if (!this.collapsed) {
        this.isFilterCollapsed = true;
        this.collapsed = true;
      }
    } else {
      this.isFilterCollapsed = false;
      this.collapsed = false;
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(event) {
    this.setCollapse(event.target.innerWidth);
  }
}
