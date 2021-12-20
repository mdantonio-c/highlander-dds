import { Component, Input, Output, EventEmitter } from "@angular/core";
import * as L from "leaflet";
import { SpatialArea } from "../../../types";

const MAP_CENTER: L.LatLng = L.latLng({ lat: 41.88, lng: 12.28 });

@Component({
  selector: "app-spatial-coverage",
  templateUrl: "./spatial-coverage.component.html",
  styleUrls: ["./spatial-coverage.component.scss"],
})
export class SpatialCoverageComponent {
  @Input() area: SpatialArea;
  selectedArea: SpatialArea;
  @Output() areaChanged: EventEmitter<SpatialArea> =
    new EventEmitter<SpatialArea>();
  private _editable: boolean = false;

  @Input() set editable(value: boolean) {
    this._editable = value;
  }

  get editable(): boolean {
    return this._editable;
  }

  drawnItems: L.FeatureGroup = L.featureGroup();
  map: L.Map;

  options = {
    layers: [
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "Open Street Map",
      }),
    ],
    zoomControl: true,
    zoom: 6,
    center: MAP_CENTER,
  };

  // toolbar
  drawAreaOptions = {
    position: "topright",
    draw: {
      polygon: false,
      circlemarker: false,
      circle: false,
      marker: false,
      polyline: false,
      rectangle: false,
    },
    edit: {
      featureGroup: this.drawnItems,
      remove: false,
    },
  };

  onMapReady(map) {
    this.map = map;
    map.zoomControl.setPosition("topright");
    map.on(L.Draw.Event.DRAWSTART, (e) => {
      this.resetAll();
    });

    map.on(L.Draw.Event.DELETED, (e) => {
      this.resetAll();
    });

    this.drawEntireArea();
  }

  private clearAll() {
    this.drawnItems.clearLayers();
  }

  private resetAll() {
    this.drawnItems.clearLayers();
  }

  /**
   * Fit bounds to given area.
   * @param area
   * @private
   */
  private fitBounds(area: L.Rectangle) {
    const southWest = area.getLatLngs()[0] as L.LatLng,
      northEast = area.getLatLngs()[2] as L.LatLng,
      bounds = L.latLngBounds(southWest, northEast);
    this.map.fitBounds(bounds, { padding: [20, 20] });
  }

  onDrawEdited(e: L.DrawEvents.Edited) {
    // console.log('draw edited')
    this.drawnItems.eachLayer((layer) => {
      this.setCurrentArea(layer as L.Rectangle);
      this.areaChanged.emit(this.selectedArea);
    });

    /*const ref = this;
    e.layers.eachLayer(function (layer, comp: SpatialCoverageComponent = ref) {
      console.log(layer);
      if (layer instanceof L.Rectangle) {
        const coords = (layer as L.Rectangle).getLatLngs();
        const selectedArea = {
          south: coords[0][0].lat,
          west: coords[0][0].lng,
          north: coords[0][2].lat,
          east: coords[0][2].lng,
        };
        comp.selectedArea = selectedArea;
        comp.areaChanged.emit(selectedArea);
      }
    });*/
  }

  resizeDraw(e: L.DrawEvents.EditResize) {
    // console.log('resize area', e);
    if (!e.layer) return;
    this.setCurrentArea(e.layer as L.Rectangle);
  }

  moveDraw(e: L.DrawEvents.EditMove) {
    // console.log('move area', e);
    if (!e.layer) return;
    this.setCurrentArea(e.layer as L.Rectangle);
  }

  private setCurrentArea(layer: L.Rectangle) {
    const coords = layer.getLatLngs();
    this.selectedArea = {
      south: coords[0][0].lat,
      west: coords[0][0].lng,
      north: coords[0][2].lat,
      east: coords[0][2].lng,
    };
  }

  onDrawEditStop(e: L.DrawEvents.EditStop) {
    // console.log('draw edit stop')
    this.editable = false;

    // force selected area to the actual draw (ON EDIT CANCEL)
    this.drawnItems.eachLayer((layer) => {
      this.setCurrentArea(layer as L.Rectangle);
    });
  }

  private drawEntireArea() {
    // create the entire rectangle area
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(this.area.south, this.area.east),
        L.latLng(this.area.north, this.area.west)
      )
    );
    // zoom the map to the rectangle bounds
    this.fitBounds(poly);
    // add to the map
    this.drawnItems.addLayer(poly);
    // update selected area
    this.selectedArea = {
      north: this.area.north,
      east: this.area.east,
      south: this.area.south,
      west: this.area.west,
    };
  }

  /**
   * Draw updated area on the map.
   * @param val the new area to draw
   * @param propagate if true, propagate set spatial coverage and size estimate
   */
  updateArea(val: SpatialArea, propagate = true) {
    // console.log(`Draw updated area on the map. Propagate? ${propagate}`);
    // clean up
    this.resetAll();

    // create the updated rectangle area
    const poly = new L.Rectangle(
      L.latLngBounds(
        L.latLng(val.south, val.east),
        L.latLng(val.north, val.west)
      )
    );

    // add to the map
    this.drawnItems.addLayer(poly);

    // emit output changes
    if (propagate) {
      this.areaChanged.emit(val);
    }
  }
}
