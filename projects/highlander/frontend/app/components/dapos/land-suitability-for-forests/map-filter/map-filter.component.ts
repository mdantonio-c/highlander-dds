import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import {
  ADMINISTRATIVE_AREAS,
  INDICATORS,
  BIOTEMPERATURES,
  BIOPRECIPITATIONS,
  SPECIES,
  PERIODS,
} from "../data";

@Component({
  selector: "forest-suitability-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<null> = new EventEmitter<null>();

  readonly indicators = INDICATORS;
  readonly administratives = ADMINISTRATIVE_AREAS;
  readonly forestSpecies = SPECIES;
  readonly bioclimaticTemperatures = BIOTEMPERATURES;
  readonly bioclimaticPrecipitations = BIOPRECIPITATIONS;
  readonly periods = PERIODS;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      indicator: ["FTY"],
      administrative: ["italy"],
      bioclimaticTemperature: [""],
      bioclimaticPrecipitation: [""],
      forestSpecie: [""],
      period: ["1991_2020"],
    });
  }

  ngOnInit() {
    this.user = this.authService.getUser();
    // subscribe for form value changes
    this.onChanges();
    // apply filter the first time
    setTimeout(() => {
      this.onFilterChange.emit(this.filterForm.value);
    }, 1000);
  }

  private onChanges(): void {
    this.filterForm.valueChanges.subscribe((val) => {
      switch (this.filterForm.get("indicator").value) {
        case "BIOTEMP":
          if (!this.filterForm.get("bioclimaticTemperature").value) {
            this.filterForm.patchValue(
              {
                forestSpecie: null,
                bioclimaticPrecipitation: null,
                // bioclimaticVariable: null,
              },
              { emitEvent: false, onlySelf: true }
            );
            return;
          }
          break;
        case "BIOPRP":
          if (!this.filterForm.get("bioclimaticPrecipitation").value) {
            /*            this.filterForm.patchValue(
            {
              forestSpecie: null,
            },
            { emitEvent: false, onlySelf: true }
          );*/
            return;
          }
          break;
        case "FOREST":
          if (!this.filterForm.get("forestSpecie").value) {
            /*        this.filterForm.patchValue(
          {
            bioclimaticVariable: null,
          },
          { emitEvent: false, onlySelf: true }
        );*/
            return;
          }
          break;
        case "FTY":
          this.filterForm.patchValue(
            {
              administrative: "italy",
            },
            { emitEvent: false, onlySelf: true }
          );
          break;
      }

      this.onFilterChange.emit(val);
    });
  }
}
