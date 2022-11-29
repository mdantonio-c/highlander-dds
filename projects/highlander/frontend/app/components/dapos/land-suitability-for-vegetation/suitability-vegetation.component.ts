import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  Input,
} from "@angular/core";
import { Observable } from "rxjs";
import { User } from "@rapydo/types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { DatasetInfo, SuitabilityVegetationFilter } from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";
import { LegendConfig, LEGEND_DATA } from "../../../services/data";
import { INDICATORS, BOUNDING_BOX } from "./data";

import * as L from "leaflet";

const MAX_ZOOM = 14;
const MIN_ZOOM = 7.25;

const JSON_STYLE = {
  weight: 2,
  opacity: 0.9,
  color: "gray",
  fillOpacity: 0,
};

@Component({
  selector: "app-suitability-vegetation",
  templateUrl: "./suitability-vegetation.component.html",
  styleUrls: ["./suitability-vegetation.component.scss"],
})
export class SuitabilityVegetationComponent implements OnInit {
  @Input()
  dataset: DatasetInfo;
  user: User;
  readonly backendURI = environment.backendURI;
  loading = false;
  isFilterCollapsed = false;
  private collapsed = false;
  map: L.Map;
  private legends: { [key: string]: L.Control } = {};
  mapsUrl: string;

  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));
  piemonteBounds = BOUNDING_BOX;
  readonly TIMERANGES = ["1991-2020", "2021-2050"];
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
    zoomSnap: 0.25,
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

  private filter: SuitabilityVegetationFilter;

  isPanelCollapsed: boolean = true;

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private ssr: SSRService,
    private cdr: ChangeDetectorRef
  ) {
    this.mapsUrl = dataService.getMapsUrl();
    //console.log(`Map url: ${this.mapsUrl}`)
  }

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
    this.initLegends(map);
    // add Piemonte layer
    this.dataService.getPiemonteArea().subscribe((json) => {
      const jsonLayer = L.geoJSON(json, {
        style: JSON_STYLE,
      });
      const bounds = jsonLayer.getBounds();
      const layerCenter = bounds.getCenter();
      this.piemonteBounds.center = layerCenter;
      jsonLayer.addTo(this.map);
    });
  }

  private setOverlaysToMap() {
    let overlays = {};
    const ind = this.filter.indicator;

    let url = `${this.mapsUrl}/wms`;

    this.TIMERANGES.forEach((m) => {
      overlays[m] = L.tileLayer.wms(url, {
        layers: `highlander:${ind}_${m}`,
        version: "1.1.0",
        format: "image/png",
        opacity: 0.7,
        transparent: true,
        attribution: "'&copy; CMCC",
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM,
      });
    });
    //console.log(overlays)
    this.layersControl["baseLayers"] = overlays;
    overlays[this.TIMERANGES[0]].addTo(this.map);

    this.map.setView(this.piemonteBounds.center, this.piemonteBounds.zoom);
  }

  private initLegends(map: L.Map) {
    INDICATORS.forEach((ind) => {
      this.legends[ind.code] = this.createLegendControl(ind.code);
      // console.log(`add legend <${ind.code}>`);
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

  onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
  }

  applyFilter(data: SuitabilityVegetationFilter) {
    console.log("apply filter", data);
    if (!this.filter) {
      this.filter = data;
      this.setOverlaysToMap();
      // add a legend
      if (this.legends[data.indicator]) {
        this.legends[data.indicator].addTo(this.map);
      }
    }

    // INDICATORS
    if (this.filter.indicator !== data.indicator) {
      //console.log(`indicator changed to ${data.indicator}`);

      // remove the previous legend
      this.map.removeControl(this.legends[this.filter.indicator]);
      // add the new legend
      this.legends[data.indicator].addTo(this.map);
      this.filter = data;

      let overlays = this.layersControl["baseLayers"];
      for (let name in overlays) {
        if (this.map.hasLayer(overlays[name])) {
          this.map.removeLayer(overlays[name]);
        }
      }
      this.setOverlaysToMap();
    }

    //if the detail panel is opened, close it
    //this.closeDetails();
  }

  isCollapsed = true;

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
