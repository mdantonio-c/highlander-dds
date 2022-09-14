import { Component, Input, Output, EventEmitter } from "@angular/core";
import * as L from "leaflet";
import "leaflet-draw";
import * as _ from "lodash";

import { SpatialArea, SpatialPoint } from "../../../types";
import { NotificationService } from "@rapydo/services/notification";

const MAP_CENTER: L.LatLng = L.latLng({ lat: 41.88, lng: 12.28 });

@Component({
  selector: "app-spatial-coverage",
  templateUrl: "./spatial-coverage.component.html",
  styleUrls: ["./spatial-coverage.component.scss"],
})
export class SpatialCoverageComponent {
  @Input() area: SpatialArea;
  selectedArea: SpatialArea;
  editableArea: SpatialArea;
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
  // drawnArea: L.Rectangle;
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
  drawOptions: L.Control.DrawConstructorOptions = {
    position: "topright",
    draw: {
      marker: false,
      polygon: false,
      circlemarker: false,
      circle: false,
      polyline: false,
      rectangle: false,
    },
    edit: {
      featureGroup: this.drawnItems,
      remove: false,
    },
  };
  showDrawControl: boolean = true;
  drawControl: L.Control.Draw;

  constructor(private notify: NotificationService) {}

  onMapReady(map: L.Map) {
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

  onDrawReady(drawControl: L.Control.Draw) {
    this.drawControl = drawControl;
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
    // console.log('draw edited: save button');
    this.selectedArea = { ...this.editableArea };
    this.areaChanged.emit(this.selectedArea);
  }

  resizeDraw(e: L.DrawEvents.EditResize) {
    // console.log('resize area', e);
    this.updateEditableArea(e.layer);
  }

  moveDraw(e: L.DrawEvents.EditMove) {
    // console.log('move area', e);
    this.updateEditableArea(e.layer);
  }

  private updateEditableArea(layer: L.Layer) {
    if (!layer) return;
    const coords = (layer as L.Rectangle).getLatLngs();
    this.editableArea = {
      south: coords[0][0].lat,
      west: coords[0][0].lng,
      north: coords[0][2].lat,
      east: coords[0][2].lng,
    };
  }

  private updateSelectedArea(layer: L.Rectangle) {
    const coords = layer.getLatLngs();
    this.selectedArea = {
      south: coords[0][0].lat,
      west: coords[0][0].lng,
      north: coords[0][2].lat,
      east: coords[0][2].lng,
    };
  }

  onDrawEditStop(e: L.DrawEvents.EditStop) {
    this.editable = false;

    // reset to the actual selected area (ON EDIT CANCEL)
    // detect 'Cancel' when editable and selected areas are different
    if (!_.isEqual(this.selectedArea, this.editableArea)) {
      // console.log('Cancel clicked');
      this.updateArea(this.selectedArea, false);
      this.editableArea = { ...this.selectedArea };
    }
  }

  private drawEntireArea() {
    // create the entire rectangle area
    if (Object.values(this.area).some((v) => v === null)) {
      console.error("Bad area", this.area);
      this.notify.showError(
        "The area CANNOT be drawn on the map as the coords are invalid"
      );
      return;
    }
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
    this.editableArea = { ...this.selectedArea };
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

    if (propagate) {
      // update selected area
      this.selectedArea = {
        north: val.north,
        east: val.east,
        south: val.south,
        west: val.west,
      };
      this.editableArea = { ...this.selectedArea };
      // emit output changes
      this.areaChanged.emit(val);
    }
  }

  /**
   * Draw updated location on the map.
   * @param loc the new Location to draw
   */
  updateLocation(loc: SpatialPoint) {
    console.log(`Draw updated location on the map: ${loc}`);
    // TODO
  }

  private toggleDrawControl() {
    this.showDrawControl = !this.showDrawControl;
  }
}
