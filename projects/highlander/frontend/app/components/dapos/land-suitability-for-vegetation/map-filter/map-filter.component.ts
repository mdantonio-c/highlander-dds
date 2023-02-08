import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import { INDICATORS, SPECIES, MAPS } from "../data";

@Component({
  selector: "suitability-vegetation-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<null> = new EventEmitter<null>();

  readonly indicators = INDICATORS;
  readonly forestSpecie = SPECIES;
  readonly forestMap = MAPS;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      indicator: ["CompI"],
      forestSpecie: [""],
      forestMap: [""],
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
      if (this.filterForm.get("indicator").value === "forest") {
        if (
          !this.filterForm.get("forestSpecie").value ||
          !this.filterForm.get("forestMap").value
        ) {
          return;
        }
      } else {
        this.filterForm.patchValue(
          {
            forestSpecie: "",
            forestMap: "",
          },
          { emitEvent: false, onlySelf: true },
        );
      }
      this.onFilterChange.emit(val);
    });
  }
}
