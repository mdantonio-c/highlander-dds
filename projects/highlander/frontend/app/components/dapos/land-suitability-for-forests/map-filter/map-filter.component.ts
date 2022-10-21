import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import {
  ADMINISTRATIVE_AREAS,
  INDICATORS,
  BIOVARIABLES,
  SPECIES,
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
  readonly biovariables = BIOVARIABLES;
  readonly forestSpecies = SPECIES;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      indicator: ["default"],
      administrative: ["italy"],
      bioclimaticVariable: [""],
      forestSpecie: [""],
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
      if (
        this.filterForm.get("indicator").value === "BIO" &&
        !this.filterForm.get("bioclimaticVariable").value
      ) {
        this.filterForm.patchValue(
          {
            forestSpecie: null,
          },
          { emitEvent: false, onlySelf: true }
        );
        return;
      } else if (
        this.filterForm.get("indicator").value === "FOREST" &&
        !this.filterForm.get("forestSpecie").value
      ) {
        this.filterForm.patchValue(
          {
            bioclimaticVariable: null,
          },
          { emitEvent: false, onlySelf: true }
        );
        return;
      }

      this.onFilterChange.emit(val);
    });
  }
}
