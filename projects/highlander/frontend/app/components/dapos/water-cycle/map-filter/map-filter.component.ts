import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { AuthService } from "@rapydo/services/auth";
import { DROUGHTS, VARIABLES, ACCUMULATIONS } from "../data";

@Component({
  selector: "water-cycle-map-filter",
  templateUrl: "./map-filter.component.html",
  styleUrls: ["./map-filter.component.scss"],
})
export class MapFilterComponent implements OnInit {
  filterForm: FormGroup;
  user;
  @Output() onFilterChange: EventEmitter<null> = new EventEmitter<null>();

  readonly droughts = DROUGHTS;
  readonly variables = VARIABLES;
  readonly accumulations = ACCUMULATIONS;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.filterForm = this.fb.group({
      drought: ["m"],
      variable: ["n"],
      accumulation: ["1"],
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
      if (this.filterForm.get("drought").value === "h") {
        this.filterForm.patchValue({ accumulation: "3" }, { emitEvent: false });
      }
      this.onFilterChange.emit(val);
    });
  }
}
