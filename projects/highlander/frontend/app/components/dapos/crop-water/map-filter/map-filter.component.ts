import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import { ADMINISTRATIVE_AREAS, LAYERS, PERCENTILES } from "../data";
import { CodeLabel, CropWaterFilter, DatasetInfo } from "../../../../types";

@Component({
  selector: "crop-water-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  /* dataset id */
  @Input() dataset: string;
  @Output() onFilterChange: EventEmitter<CropWaterFilter> =
    new EventEmitter<CropWaterFilter>();

  readonly crops = [];
  readonly areas = ADMINISTRATIVE_AREAS;
  readonly percentiles = PERCENTILES;
  readonly layers = LAYERS;

  constructor(private fb: FormBuilder, private authService: AuthService) {}

  ngOnInit() {
    console.log(`load config for dataset ${this.dataset}`);
    this.filterForm = this.fb.group({
      layer: [LAYERS[this.dataset][0].code],
      area: [ADMINISTRATIVE_AREAS[this.dataset][0].code],
      percentile: [50],
    });

    this.user = this.authService.getUser();
    // subscribe for form value changes
    this.onChanges();
    // apply filter the first time
    this.onFilterChange.emit(this.filterForm.value);
  }

  private onChanges(): void {
    this.filterForm.valueChanges.subscribe((val) => {
      if (val.layer == "ID_CROP") {
        delete val.percentile;
      }
      this.onFilterChange.emit(val);
    });
  }
}
