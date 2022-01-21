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
import {
  DatasetInfo,
  ProvinceFeature,
  RegionFeature,
  SoilErosionFilter,
} from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";
import { LegendConfig, LEGEND_DATA } from "../../../services/data";

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
  selector: "app-soil-erosion",
  templateUrl: "./soil-erosion.component.html",
  styleUrls: ["./soil-erosion.component.scss"],
})
export class SoilErosionComponent implements OnInit {
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
  private filter: SoilErosionFilter;

  isPanelCollapsed: boolean = true;

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private ssr: SSRService,
    private cdr: ChangeDetectorRef
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
    this.filter = data;

    // ADMINISTRATIVE AREA
    // clear current administrative layer
    if (this.map) {
      this.administrativeArea.clearLayers();
    }
    if (data.administrative === "italy") {
      if (this.map) {
        this.map.setView(L.latLng([42.0, 13.0]), 6);
      }
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
              click: (e) => this.loadDetails(e),
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

  private loadDetails(e) {
    this.isPanelCollapsed = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);

    const layer = e.target;
    this.map.fitBounds(layer.getBounds());
    switch (this.filter.administrative) {
      case "regions":
        console.log((layer.feature.properties as RegionFeature).name);
        break;
      case "provinces":
        console.log((layer.feature.properties as ProvinceFeature).prov_name);
        break;
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
