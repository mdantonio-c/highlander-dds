import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  Input,
} from "@angular/core";
import { Observable } from "rxjs";
import { User } from "@rapydo/types";
//import { AuthService } from "@rapydo/services/auth";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
//TODO nuovi tipi dei filters e del crop
import {
  DatasetInfo,
  ProvinceFeature,
  RegionFeature,
  BasinFeature,
  WaterCycleFilter,
  SoilErosionMapCrop,
} from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";
import { LegendConfig, LEGEND_DATA } from "../../../services/data";
import { DROUGHTS, VARIABLES, ACCUMULATIONS, DATASETS } from "./data";

import * as L from "leaflet";
import "leaflet-timedimension/dist/leaflet.timedimension.src.js";

const MAX_ZOOM = 14;
const MIN_ZOOM = 9;

const JSON_STYLE = {
  weight: 2,
  opacity: 0.9,
  color: "gray",
  fillOpacity: 0,
};

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
  selector: "app-water-cycle",
  templateUrl: "./water-cycle.component.html",
  styleUrls: ["./water-cycle.component.scss"],
})
export class WaterCycleComponent implements OnInit {
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
  readonly basins = [
    "Ofanto_Samuele_Cafiero",
    "Ofanto_Monteverde_Scalo",
    "Ofanto_Cairano_Scalo",
  ];

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
  layerControlElement: HTMLElement[];

  options = {
    layers: [this.LAYER_OSM],
    zoom: 9.5,
    fullscreenControl: true,
    center: L.latLng([41.01, 15.64]),
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

  //private administrativeArea: L.LayerGroup = new L.LayerGroup();
  private filter: WaterCycleFilter;

  administrative: string;
  currentModel: string;
  //TODO
  mapCropDetails: SoilErosionMapCrop;
  isPanelCollapsed: boolean = true;
  isHydrological: boolean = false;
  selectedLayer;

  constructor(
    private dataService: DataService,
    //private authService: AuthService,
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
    /* this.authService.isAuthenticated().subscribe((isAuth) => {
      this.user = isAuth ? this.authService.getUser() : null;
    }); */
  }

  onMapReady(map: L.Map) {
    this.map = map;
    setTimeout(function () {
      map.invalidateSize();
    }, 200);
    // add the basins layers
    //let jsonBasins = new L.FeatureGroup()
    this.basins.forEach((b) => {
      this.dataService.getGeojsonLayer(b).subscribe((json) => {
        const jsonLayer = L.geoJSON(json, {
          style: JSON_STYLE,
          onEachFeature: (feature, layer) =>
            layer.on({
              mouseover: (e) => this.highlightFeature(e),
              mouseout: (e) => this.resetFeature(e),
              click: (e) => this.loadDetails(e),
            }),
        });
        //jsonBasins.addLayer(jsonLayer)
        jsonLayer.addTo(this.map);
      });
    });
    //jsonBasins.addTo(this.map);

    this.initLegends(map);
    // detect the change of model
    const ref = this;
    map.on(
      "baselayerchange",
      (e: L.LayerEvent, comp: WaterCycleComponent = ref) => {
        comp.getTheSelectedModel(e.layer["_leaflet_id"]);
      },
    );
  }

  private setOverlaysToMap() {
    let overlays = {};
    //console.log(this.filter)
    if (this.filter.drought !== "h") {
      this.isHydrological = false;

      let url = `${this.mapsUrl}/wms`;

      DATASETS.forEach((d) => {
        overlays[d.label] = L.tileLayer.wms(url, {
          layers: `highlander:${d.code}_MD_${this.filter.variable}m_${this.filter.accumulation}`,
          version: "1.1.0",
          format: "image/png",
          opacity: 0.7,
          transparent: true,
          attribution: "&copy; Highlander",
          maxZoom: MAX_ZOOM,
          minZoom: MIN_ZOOM,
        });
      });
      //console.log(overlays)
      this.layersControl["baseLayers"] = overlays;
      // get the layer control element
      this.layerControlElement = Array.from(
        document.getElementsByClassName(
          "leaflet-control-layers",
        ) as HTMLCollectionOf<HTMLElement>,
      );
      if (this.layerControlElement) {
        this.layerControlElement[0].style.visibility = "visible";
      }
      overlays[DATASETS[0].label].addTo(this.map);
    } else {
      this.isHydrological = true;
      // hide the layer control
      if (this.layerControlElement) {
        this.layerControlElement[0].style.visibility = "hidden";
      }
    }
  }

  private initLegends(map: L.Map) {
    VARIABLES.forEach((ind) => {
      this.legends[ind.code] = this.createLegendControl(`${ind.code}`);
      //console.log(`add legend <${ind.code}_${per.code}>`);
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

  applyFilter(data: WaterCycleFilter) {
    console.log("apply filter", data);
    if (!this.filter) {
      this.filter = data;
      this.setOverlaysToMap();
      // add a legend
      if (this.legends[data.variable]) {
        this.legends[data.variable].addTo(this.map);
      }
    }

    // INDICATORS
    if (
      this.filter.drought !== data.drought ||
      this.filter.variable !== data.variable ||
      this.filter.accumulation !== data.accumulation
    ) {
      // console.log(`indicator changed to ${data.indicator}`);

      // remove the previous legend
      this.map.removeControl(this.legends[this.filter.variable]);
      // add the new legend
      if (data.drought !== "h") {
        this.legends[data.variable].addTo(this.map);
      }

      this.filter = data;

      let overlays = this.layersControl["baseLayers"];
      for (let name in overlays) {
        if (this.map.hasLayer(overlays[name])) {
          this.map.removeLayer(overlays[name]);
        }
      }

      this.setOverlaysToMap();
    }

    /*
    // PERIOD
    if (this.filter.period !== data.period) {
      // console.log(`indicator changed to ${data.indicator}`);

      // remove the previous legend
      this.map.removeControl(
        this.legends[`${this.filter.indicator}_${this.filter.period}`]
      );
      // add the new legend
      this.legends[`${data.indicator}_${data.period}`].addTo(this.map);
      this.filter = data;

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
    this.mapCropDetails.period = this.filter.period;
    this.mapCropDetails.product = indicator.product;
    this.mapCropDetails.area_type = this.administrative;
    //force the ngonChanges of the child component
    this.mapCropDetails = Object.assign({}, this.mapCropDetails); */
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

  getTheSelectedModel(leaflet_id) {
    for (const [key, value] of Object.entries(
      this.layersControl["baseLayers"],
    )) {
      if (value["_leaflet_id"] == leaflet_id) {
        this.currentModel = key;
        break;
      }
    }
    this.cdr.detectChanges();
    //console.log(`current model:${this.mapCropDetails.model}`)
  }

  private loadDetails(e) {
    const layer = e.target;
    console.log(layer.feature.properties.Label);
    /*setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
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
      case "basins":
        this.mapCropDetails.area_id = (
          layer.feature.properties as BasinFeature
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
    this.cdr.detectChanges();*/
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
