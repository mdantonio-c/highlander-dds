import { Component, Input, OnInit, HostListener } from "@angular/core";
import { trigger, style, animate, transition } from "@angular/animations";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import * as L from "leaflet";
// import { SpatialArea } from "../../../types";

@Component({
  selector: "app-map-side-nav",
  templateUrl: "./map-side-nav.component.html",
  styleUrls: ["./map-side-nav.component.scss"],
  animations: [
    trigger("openClose", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("500ms", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("0ms", style({ opacity: 0 }))]),
    ]),
  ],
})
export class MapSideNavComponent implements OnInit {
  @Input() north: number;
  @Input() east: number;
  @Input() south: number;
  @Input() west: number;

  spatialForm: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.spatialForm = this.fb.group({
      north: [this.north],
      east: [this.east],
      south: [this.south],
      west: [this.west],
      lat: [""],
      lon: [""],
      coverageType: ["area", Validators.required],
    });
  }

  resetArea() {
    this.spatialForm.patchValue({
      north: this.north,
      east: this.east,
      south: this.south,
      west: this.west,
    });
  }

  @HostListener("dblclick", ["$event"])
  @HostListener("click", ["$event"])
  @HostListener("mousedown", ["$event"])
  @HostListener("wheel", ["$event"])
  public onClick(event: any): void {
    event.stopPropagation();
  }
}
