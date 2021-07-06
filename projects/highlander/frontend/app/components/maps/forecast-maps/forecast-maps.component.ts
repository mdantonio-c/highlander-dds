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
import { DatasetInfo } from "../../../types";
import { environment } from "@rapydo/../environments/environment";
import { DataService } from "../../../services/data.service";
import { SSRService } from "@rapydo/services/ssr";

import * as moment from "moment";
import * as L from "leaflet";
import "leaflet-timedimension/dist/leaflet.timedimension.src.js";
declare module "leaflet" {
  let timeDimension: any;
}

const MAX_ZOOM = 8;
const MIN_ZOOM = 5;

@Component({
  selector: "hl-forecast-maps",
  templateUrl: "./forecast-maps.component.html",
  styleUrls: ["./forecast-maps.component.css"],
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

  bounds = new L.LatLngBounds(new L.LatLng(30, -20), new L.LatLng(55, 40));

  LAYER_OSM = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">Open Street Map</a> ',
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
    }
  );

  layersControl = {
    baseLayers: {
      "Openstreet Map": this.LAYER_OSM,
    },
  };

  options = {
    layers: [this.LAYER_OSM],
    zoom: 6,
    fullscreenControl: true,
    center: L.latLng([42.0, 13.0]),
    timeDimension: true,
    timeDimensionControl: true,
    maxBounds: this.bounds,
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
  }

  onMapZoomEnd($event) {
    console.log(`Map Zoom: ${this.map.getZoom()}`);
  }

  applyFilter(filter: any) {
    console.log("apply filter");
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
