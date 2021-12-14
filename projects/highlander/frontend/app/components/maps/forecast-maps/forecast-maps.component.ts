import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Observable } from "rxjs";
import { User } from "@rapydo/types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { DatasetInfo, SoilErosionFilter } from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";
import { LegendConfig, LEGEND_DATA } from "../../../services/data";

import * as moment from "moment";
import { mergeMap, map, throttleTime, filter } from "rxjs/operators";
import * as L from "leaflet";
import "leaflet-timedimension/dist/leaflet.timedimension.src.js";
declare module "leaflet" {
  let timeDimension: any;
}

const MAX_ZOOM = 8;
const MIN_ZOOM = 5;

const HIGHLIGHT_STYLE = {
  weight: 5,
  color: "#666",
  dashArray: "",
  fillOpacity: 0.7,
};
const NORMAL_STYLE = {
  weight: 2,
  opacity: 0.9,
  color: "gray",
  fillOpacity: 0.25,
};

@Component({
  selector: "hl-forecast-maps",
  templateUrl: "./forecast-maps.component.html",
  styleUrls: ["./forecast-maps.component.scss"],
})
export class ForecastMapsComponent implements OnInit {
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
    : "http://localhost:8070";

  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));
  readonly models = [...Array(12)].map((_, i) => `R${i + 1}`);
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
  layerControl;
  layersControl = {
    baseLayers: {
      "Openstreet Map": this.LAYER_OSM,
    },
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

  private administrativeArea: L.LayerGroup = new L.LayerGroup();

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    public route: ActivatedRoute,
    private router: Router,
    private ssr: SSRService
  ) {
    this.dataset = this.router.getCurrentNavigation().extras
      .state as DatasetInfo;
  }

  ngOnInit() {
    if (this.ssr.isBrowser) {
      this.setCollapse(window.innerWidth);
    }

    const datasetName = this.route.snapshot.paramMap.get("ds_name");
    if (!datasetName) {
      this.notify.showError("ds_name parameter not found");
      return;
    }

    if (!this.dataset) {
      // console.log(`load dataset <${dataset_name}>`);
      this.spinner.show();
      this.dataService
        .getDataset(datasetName)
        .subscribe(
          (data) => {
            this.dataset = data;
          },
          (error) => {
            this.notify.showError(error);
          }
        )
        .add(() => {
          this.spinner.hide();
        });
    }
  }

  onMapReady(map: L.Map) {
    this.map = map;
    this.setOverlaysToMap();
    // add a legend
    let legend = this.createLegendControl("prp");
    if (legend) {
      legend.addTo(map);
    }
  }

  private setOverlaysToMap() {
    let overlays = {};
    this.models.forEach((m) => {
      overlays[m] = L.tileLayer.wms(`${this.baseUrl}/geoserver/wms`, {
        layers: `highlander:TOT_PREC_${m}`,
        version: "1.1.0",
        format: "image/png",
        opacity: 0.5,
        transparent: true,
        attribution: "'&copy; CMCC",
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM,
      });
    });
    L.control.layers(overlays, null, { collapsed: false }).addTo(this.map);
    overlays[this.models[0]].addTo(this.map);
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

  applyFilter(data: SoilErosionFilter) {
    console.log("apply filter", data);

    // ADMINISTRATIVE AREA
    // clear current administrative layer
    if (this.map) {
      this.administrativeArea.clearLayers();
    }
    if (data.administrative === "italy") {
      return;
    }
    this.dataService
      .getAdministrativeAreas(data.administrative)
      .subscribe((json) => {
        const jsonLayer = L.geoJSON(json, {
          style: NORMAL_STYLE,
          onEachFeature: (feature, layer) =>
            layer.on({
              mouseover: (e) => this.highlightFeature(e),
              mouseout: (e) => this.resetFeature(e),
            }),
        });
        this.administrativeArea.addLayer(jsonLayer);
        this.administrativeArea.addTo(this.map);
      });
  }

  private highlightFeature(e) {
    const layer = e.target;
    layer.setStyle(HIGHLIGHT_STYLE);
  }

  private resetFeature(e) {
    const layer = e.target;
    layer.setStyle(NORMAL_STYLE);
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
