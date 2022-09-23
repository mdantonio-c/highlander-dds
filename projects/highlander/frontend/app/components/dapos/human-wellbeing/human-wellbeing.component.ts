import { Component, OnInit, Input, HostListener } from "@angular/core";
import { User } from "@rapydo/types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { SSRService } from "@rapydo/services/ssr";
import { DatasetInfo, HumanWellbeingFilter } from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import * as L from "leaflet";
import * as moment from "moment";
import "leaflet-timedimension/dist/leaflet.timedimension.src.js";
import { DataService } from "../../../services/data.service";
import { INDICATORS } from "../human-wellbeing/data";
import { LEGEND_DATA, LegendConfig } from "../../../services/data";
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
  readonly backendURI = environment.backendURI;
  loading = false;
  isFilterCollapsed = false;
  private collapsed = false;
  map: L.Map;
  private legends: { [key: string]: L.Control } = {};
  baseUrl: string = environment.production
    ? `${environment.backendURI}`
    : "http://localhost:8080";

  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));
  readonly timeRanges = ["historical", "future"];
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

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private ssr: SSRService
  ) {}

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
  }

  private setOverlaysToMap() {
    let overlays = {};
    const ind = this.filter.indicator;
    const metric = this.filter.daily_metric;
    let layers = null;
    let url = null;
    if (this.filter.timePeriod == "multi-year") {
      layers = `highlander:${ind}_1989-2020_${metric}_VHR-REA_multiyearmean`;
      url = `${this.baseUrl}/geoserver/wms`;
    } else {
      // get the date
      const year = moment(this.filter.day).format("YYYY");
      const date = moment(this.filter.day).format("YYYY-MM-DD");
      layers = `highlander:${ind}_${year}_${metric}-grid_regular`;
      url = `${this.baseUrl}/geoserver/wms?time=${date}`;
    }

    overlays[`Historical`] = L.tileLayer.wms(url, {
      layers: layers,
      version: "1.1.0",
      format: "image/png",
      opacity: 0.7,
      transparent: true,
      attribution: "'&copy; CMCC",
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    });

    this.layersControl["baseLayers"] = overlays;
    // for the moment only a single overlay is available
    overlays[`Historical`].addTo(this.map);
  }

  private initLegends(map: L.Map) {
    INDICATORS.forEach((ind) => {
      this.legends[ind.code] = this.createLegendControl(ind.code);
      //console.log(`add legend <${ind.code}>`);
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

  applyFilter(data: HumanWellbeingFilter) {
    console.log("apply filter", data);

    if (!this.filter) {
      this.filter = data;
      this.setOverlaysToMap();
      // add a legend
      if (this.legends[data.indicator]) {
        this.legends[data.indicator].addTo(this.map);
      }
    }

    // INDICATORS and DAILY METRICS
    if (
      this.filter.indicator !== data.indicator ||
      this.filter.daily_metric !== data.daily_metric
    ) {
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
    // TIME PERIOD AND DAY
    if (
      this.filter.timePeriod !== data.timePeriod ||
      this.filter.day !== data.day
    ) {
      // change the filter and the overlay
      this.filter = data;

      let overlays = this.layersControl["baseLayers"];
      for (let name in overlays) {
        if (this.map.hasLayer(overlays[name])) {
          this.map.removeLayer(overlays[name]);
        }
      }
      this.setOverlaysToMap();
    }
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
