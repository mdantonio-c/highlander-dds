import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  Input,
} from "@angular/core";
import { User } from "@rapydo/types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import {
  DatasetInfo,
  SuitabilityVegetationFilter,
  SuitabilityVegetationFeatureInfo,
} from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";
import { LegendConfig, LEGEND_DATA } from "../../../services/data";
import { INDICATORS, MAPS, BOUNDING_BOX, TIMERANGES } from "./data";

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
  readonly LEGEND_POSITION = "bottomleft";

  pointValues: number[];
  pointMarker: L.Marker = null;
  isPointSelected: boolean = false;
  yLabel: string = null;
  selectedPointLat: number;
  selectedPointLon: number;
  queryLayers: string[] = [];
  hasTimeranges: boolean = true;

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
    private cdr: ChangeDetectorRef,
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
    this.dataService.getGeojsonLayer("Piemonte-region").subscribe((json) => {
      const jsonLayer = L.geoJSON(json, {
        style: JSON_STYLE,
        onEachFeature: (feature, layer) =>
          layer.on({
            click: (e) => {
              // remove the previous marker
              if (this.pointMarker) {
                this.map.removeLayer(this.pointMarker);
              }
              this.getPointData(e);
            },
          }),
      });
      const bounds = jsonLayer.getBounds();
      const layerCenter = bounds.getCenter();
      this.piemonteBounds.center = layerCenter;
      jsonLayer.addTo(this.map);
    });
  }

  private setOverlaysToMap() {
    let overlays = {};
    this.queryLayers = [];
    const ind = this.filter.indicator;

    let url = `${this.mapsUrl}/wms`;

    let layers = "";
    let style = "";
    if (this.filter.indicator !== "forest") {
      layers = `highlander:${this.filter.indicator}`;
      let indicator = INDICATORS.find((x) => x.code === this.filter.indicator);
      style = indicator.style;
    } else {
      layers = `highlander:${this.filter.forestMap}_${this.filter.forestSpecie}`;
      let forestMap = MAPS.find((x) => x.code === this.filter.forestMap);
      style = forestMap.style;
    }
    let layerControlElement = Array.from(
      document.getElementsByClassName(
        "leaflet-control-layers",
      ) as HTMLCollectionOf<HTMLElement>,
    );

    //check if controls for timeranges are needed
    this.hasTimeranges = true;
    if (this.filter.indicator == "forest") {
      if (
        this.filter.forestMap == "delta-suit" ||
        this.filter.forestMap == "rangesize-change"
      ) {
        this.hasTimeranges = false;
      }
    } else {
      this.hasTimeranges = true;
    }

    if (this.hasTimeranges) {
      TIMERANGES.forEach((m) => {
        overlays[m] = L.tileLayer.wms(url, {
          layers: `${layers}_${m}`,
          version: "1.1.0",
          format: "image/png",
          opacity: 0.7,
          transparent: true,
          attribution: "&copy; Highlander",
          maxZoom: MAX_ZOOM,
          minZoom: MIN_ZOOM,
          styles: `highlander:${style}`,
        });
        this.queryLayers.push(`${layers}_${m}`);
      });
      //console.log(overlays)
      this.layersControl["baseLayers"] = overlays;
      // make sure the layers controls are visible
      layerControlElement[0].style.visibility = "visible";
      overlays[TIMERANGES[0]].addTo(this.map);
    } else {
      overlays[this.filter.forestMap] = L.tileLayer.wms(url, {
        layers: layers,
        version: "1.1.0",
        format: "image/png",
        opacity: 0.7,
        transparent: true,
        attribution: "&copy; Highlander",
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM,
        styles: `highlander:${style}`,
      });
      this.queryLayers.push(`${layers}`);
      //console.log(overlays)
      this.layersControl["baseLayers"] = overlays;
      // hide the layer control (we have now a single overlay)
      layerControlElement[0].style.visibility = "hidden";
      overlays[this.filter.forestMap].addTo(this.map);
    }

    this.map.setView(this.piemonteBounds.center, this.piemonteBounds.zoom);
    //this.map.on('click', this.getPointData.bind(this));
  }

  private initLegends(map: L.Map) {
    INDICATORS.forEach((ind) => {
      if (ind.code != "forest") {
        this.legends[ind.code] = this.createLegendControl(ind.code);
        // console.log(`add legend <${ind.code}>`);
      }
    });

    // the different forests maps have different legends
    MAPS.forEach((fmap) => {
      this.legends[fmap.code] = this.createLegendControl(fmap.code);
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
      if (data.indicator === "forest") {
        if (this.legends[data.forestMap]) {
          this.legends[data.forestMap].addTo(this.map);
        }
        this.yLabel = data.forestMap;
      } else if (this.legends[data.indicator]) {
        this.legends[data.indicator].addTo(this.map);
        this.yLabel = data.indicator;
      }
    }

    // INDICATORS
    if (
      this.filter.indicator !== data.indicator ||
      this.filter.forestSpecie !== data.forestSpecie ||
      this.filter.forestMap !== data.forestMap
    ) {
      //console.log(`indicator changed to ${data.indicator}`);

      let legend_to_remove =
        this.filter.indicator !== "forest"
          ? this.filter.indicator
          : this.filter.forestMap;
      // remove the previous legend
      this.map.removeControl(this.legends[legend_to_remove]);
      // add the new legend
      if (data.indicator === "forest") {
        this.legends[data.forestMap].addTo(this.map);
        this.yLabel = data.forestMap;
      } else {
        this.legends[data.indicator].addTo(this.map);
        this.yLabel = data.indicator;
      }
      this.filter = data;

      let overlays = this.layersControl["baseLayers"];
      for (let name in overlays) {
        if (this.map.hasLayer(overlays[name])) {
          this.map.removeLayer(overlays[name]);
        }
      }
      this.setOverlaysToMap();
      // if there is a selected point, delete it
      this.closeGraph();
    }

    //if the detail panel is opened, close it
    //this.closeDetails();
  }

  getPointData(e) {
    // add a marker on the map
    let markerIcon = L.divIcon({
      html: '<i class="fa fa-map-marker-alt fa-3x"></i>',
      iconSize: [20, 20],
      iconAnchor: [12, 40],
      className: "mstDivIcon",
    });
    const pointDataMarker = new L.Marker([e.latlng.lat, e.latlng.lng], {
      icon: markerIcon,
    });
    pointDataMarker.addTo(this.map);
    this.pointMarker = pointDataMarker;
    this.isPointSelected = true;
    this.selectedPointLon = e.latlng.lng;
    this.selectedPointLat = e.latlng.lat;

    let x = this.map.layerPointToContainerPoint(e.layerPoint).x;
    let y = this.map.layerPointToContainerPoint(e.layerPoint).y;
    let bbox = this.map.getBounds().toBBoxString();
    let width = this.map.getSize().x;
    let height = this.map.getSize().y;
    let indicator = INDICATORS.find((x) => x.code === this.filter.indicator);
    this.dataService
      .getFeatureInfo(bbox, width, height, x, y, this.queryLayers.join(","))
      .subscribe(
        (response) => {
          let pointFeatureInfos: SuitabilityVegetationFeatureInfo[];
          pointFeatureInfos = response.features;
          this.pointValues = [];
          for (const m of pointFeatureInfos) {
            this.pointValues.push(m.properties[indicator.band]);
          }
          //console.log(this.pointValues)
          this.cdr.detectChanges();
        },
        (error) => {
          this.notify.showError(error);
        },
      );
  }

  closeGraph() {
    //remove marker
    if (this.pointMarker) {
      this.map.removeLayer(this.pointMarker);
    }
    //remove point data
    this.pointValues = [];
    // close graph
    this.isPointSelected = false;
    //trigger change detection
    this.cdr.detectChanges();
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
