import {
  Component,
  OnInit,
  Input,
  HostListener,
  ChangeDetectorRef,
} from "@angular/core";
import { User } from "@rapydo/types";
import { AuthService } from "@rapydo/services/auth";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { SSRService } from "@rapydo/services/ssr";
import {
  DatasetInfo,
  HumanWellbeingFilter,
  HumanWellbeingMapCrop,
  ProvinceFeature,
  RegionFeature,
} from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import * as L from "leaflet";
import * as moment from "moment";
import "leaflet-timedimension/dist/leaflet.timedimension.src.js";
import { DataService } from "../../../services/data.service";
import { INDICATORS } from "../human-wellbeing/data";
import { LEGEND_DATA, LegendConfig } from "../../../services/data";

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
  fillOpacity: 0,
};
const SELECT_STYLE = {
  weight: 5,
  color: "#466c91",
  dashArray: "",
  fillOpacity: 0.7,
  zIndex: 100,
};

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
  mapsUrl: string;

  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));
  readonly timeRanges = ["historical", "future"];
  readonly LEGEND_POSITION = "bottomleft";

  LAYER_OSM = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Open Street Map</a>',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    },
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

  private administrativeArea: L.LayerGroup = new L.LayerGroup();
  private filter: HumanWellbeingFilter;

  administrative: string;
  date: string = null;
  year: string = null;
  mapCropDetails: HumanWellbeingMapCrop;
  isPanelCollapsed: boolean = true;
  selectedLayer;

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private ssr: SSRService,
    private cdr: ChangeDetectorRef,
  ) {
    this.mapCropDetails = {};
    this.mapsUrl = dataService.getMapsUrl();
  }

  ngOnInit() {
    if (this.ssr.isBrowser) {
      this.setCollapse(window.innerWidth);
    }
    this.authService.isAuthenticated().subscribe((isAuth) => {
      this.user = isAuth ? this.authService.getUser() : null;
    });
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
      url = `${this.mapsUrl}/wms`;
    } else {
      layers = `highlander:${ind}_${this.year}_${metric}-grid_regular`;
      url = `${this.mapsUrl}/wms?time=${this.date}`;
    }

    overlays[`Historical`] = L.tileLayer.wms(url, {
      layers: layers,
      version: "1.1.0",
      format: "image/png",
      opacity: 0.7,
      transparent: true,
      attribution: "&copy; Highlander",
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
      // get the date
      if (this.filter.day && this.filter.timePeriod == "daily") {
        this.year = moment(this.filter.day).format("YYYY");
        this.date = moment(this.filter.day).format("YYYY-MM-DD");
      } else {
        this.year = null;
        this.date = null;
      }

      let overlays = this.layersControl["baseLayers"];
      for (let name in overlays) {
        if (this.map.hasLayer(overlays[name])) {
          this.map.removeLayer(overlays[name]);
        }
      }
      this.setOverlaysToMap();
    }
    // ADMINISTRATIVE AREA
    this.administrative = data.administrative;
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
      .getGeojsonLayer(`italy-${data.administrative}`)
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
    //if the detail panel is opened, close it
    this.closeDetails();

    // update the map crop details model
    // get the indicator
    let indicator_code = this.filter.indicator;
    const indicator = INDICATORS.find((x) => x.code == indicator_code);
    this.mapCropDetails.indicator = indicator.code;
    this.mapCropDetails.product = this.filter.timePeriod; //daily and multi-year are the two HW products
    this.mapCropDetails.area_type = this.administrative;
    this.mapCropDetails.daily_metric = this.filter.daily_metric;
    this.mapCropDetails.year = this.year;
    this.mapCropDetails.date = this.date;
    //force the ngonChanges of the child component
    this.mapCropDetails = Object.assign({}, this.mapCropDetails);
  }
  checkSelectedFeature(layer) {
    let layerName = layer.feature.properties.name;

    if (this.mapCropDetails && layerName) {
      if (this.mapCropDetails.area_id !== layerName) {
        return false;
      }
    } else {
      // no area has been selected
      return false;
    }
    return true;
  }

  private highlightFeature(e) {
    const layer = e.target;
    const isSelected = this.checkSelectedFeature(layer);
    if (!isSelected) {
      layer.setStyle(HIGHLIGHT_STYLE);
    }
  }

  private resetFeature(e) {
    const layer = e.target;
    const isSelected = this.checkSelectedFeature(layer);
    if (!isSelected) {
      layer.setStyle(NORMAL_STYLE);
    }
  }

  private loadDetails(e) {
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
    const layer = e.target;
    if (this.selectedLayer) {
      // set the normal style to the previously selected layer
      this.selectedLayer.setStyle(NORMAL_STYLE);
    }
    const bounds = layer.getBounds();
    const layerCenter = bounds.getCenter();

    setTimeout(() => {
      this.map.setView(layerCenter);
    }, 1);

    switch (this.administrative) {
      case "regions":
        this.mapCropDetails.area_id = (
          layer.feature.properties as RegionFeature
        ).name;
        //console.log("region: "+this.mapCropDetails.area_id);
        break;
      case "provinces":
        this.mapCropDetails.area_id = (
          layer.feature.properties as ProvinceFeature
        ).name;
        //console.log("province: "+this.mapCropDetails.area_id);
        break;
    }
    //force the ngonChanges of the child component
    this.mapCropDetails = Object.assign({}, this.mapCropDetails);
    this.isPanelCollapsed = false;

    // change the layer style
    layer.setStyle(SELECT_STYLE);
    // set the current selected layer
    setTimeout(() => {
      this.selectedLayer = layer;
    }, 0);
    this.cdr.detectChanges();
  }

  isCollapsed = true;

  closeDetails() {
    this.isPanelCollapsed = true;
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
    setTimeout(() => {
      this.map.setView(L.latLng([42.0, 13.0]), 6);
    }, 1);
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
