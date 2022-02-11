import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  OnDestroy,
} from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import {
  DatasetInfo,
  DatasetVariables,
  ProductInfo,
  StorageUsage,
  Widget,
  SpatialArea,
  LatLngRange,
} from "../../types";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from "@angular/forms";
import {
  Observable,
  forkJoin,
  throwError,
  of,
  empty,
  ReplaySubject,
} from "rxjs";
import {
  startWith,
  mergeMap,
  switchMap,
  tap,
  takeUntil,
  catchError,
  debounceTime,
  throttleTime,
  distinctUntilChanged,
} from "rxjs/operators";

@Component({
  selector: "data-extraction-modal",
  templateUrl: "./data-extraction-modal.component.html",
})
export class DataExtractionModalComponent implements OnInit, OnDestroy {
  @Input() dataset: DatasetInfo;
  @Input() productId: string;
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  productName: string;
  filterForm: FormGroup;
  productInfo: ProductInfo;
  active = 1;
  estimatedSize$: Observable<number>;
  estimatedSize: number;
  usage: StorageUsage;
  // the initial whole area
  initialArea: SpatialArea = {
    north: null,
    east: null,
    south: null,
    west: null,
  };
  remaining: number;
  private latitude: LatLngRange;
  private longitude: LatLngRange;
  private loading: boolean;
  private destroy$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.spinner.show("extSpinner");
    this.loading = true;
    forkJoin({
      storageUsage: this.dataService.getStorageUsage(),
      datasetProduct: this.dataService.getDatasetProduct(
        this.dataset.id,
        this.productId
      ),
    })
      .pipe(catchError((error) => of(error)))
      .subscribe(
        ({ storageUsage, datasetProduct }) => {
          this.usage = storageUsage;
          this.remaining = this.usage.quota - this.usage.used;
          this.productInfo = datasetProduct;
          this.productName = this.productInfo.label;
          this.filterForm = this.toFormGroup(datasetProduct);
          // check spatial coverage
          for (let widget of this.productInfo.widgets) {
            if (widget.name === "area") {
              for (let field of widget.details.fields) {
                if (field.name in this.initialArea) {
                  this.initialArea[field.name] = field.range;
                }
              }
              break;
            }
          }
          this.onFilterChange();
        },
        (error) => {
          this.notify.showError(error);
          this.spinner.hide("extSpinner");
          this.loading = false;
        }
      );
  }

  private onFilterChange() {
    this.filterForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        startWith(this.filterForm.value),
        tap(() => {
          this.spinner.show("extSpinner");
          this.loading = true;
        }),
        switchMap(() => {
          return this.dataService
            .getSizeEstimate(this.dataset.id, this.buildRequest())
            .pipe(
              // put catch error into inner observable in order
              // to keep outer observable live
              catchError((err) => {
                console.error(err);
                return of(null);
              })
            );
        }),
        tap((size) => {
          if (size) {
            this.remaining = this.usage.quota - this.usage.used - size;
          } else {
            this.notify.showWarning("Unable to calculate the size estimate.");
            // TODO at this point the FormControl that caused the error should be unchecked
          }
          this.spinner.hide("extSpinner");
          this.loading = false;
        })
      )
      .subscribe((val) => {
        if (val) {
          this.estimatedSize = val;
        }
      });
  }

  getWidget(widgetName: string): Widget {
    if (!this.productInfo) return;
    // @ts-ignore
    return this.productInfo.widgets.find((w) => w.name == widgetName);
  }

  onListChange(e, filter: string) {
    const checkArray: FormArray = this.filterForm.get(filter) as FormArray;
    if (!checkArray) {
      console.warn(`filter '${filter}' not yet managed!`);
      return;
    }
    if (e.target.checked) {
      checkArray.push(new FormControl(e.target.value));
    } else {
      let i: number = 0;
      checkArray.controls.forEach((item: AbstractControl) => {
        if (item.value == e.target.value) {
          checkArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  submit() {
    this.passEntry.emit(this.buildRequest());
    this.activeModal.close();
  }

  private buildRequest() {
    let res = {
      product: this.productId,
    };
    Object.keys(this.filterForm.controls).forEach((key) => {
      let controlValue = this.filterForm.controls[key].value;
      // @ts-ignore
      if (!key.startsWith("time_") && controlValue && controlValue.length) {
        res[key] = controlValue;
      }
    });
    // add time model
    let years: string[] = (this.filterForm.controls.time_year as FormArray)
      .value;
    let months: string[] = (this.filterForm.controls.time_month as FormArray)
      .value;
    let days: string[] = (this.filterForm.controls.time_day as FormArray).value;
    let hours: string[] = (this.filterForm.controls.time_hour as FormArray)
      .value;
    if (years.length || months.length || days.length || hours.length) {
      let time = {};
      if (years.length) {
        time["year"] = years;
      }
      if (months.length) {
        time["month"] = months;
      }
      if (days.length) {
        time["day"] = days;
      }
      if (hours.length) {
        time["hour"] = hours;
      }
      res["time"] = time;
    }
    // add spatial coverage
    let area: SpatialArea = (this.filterForm.controls.area as AbstractControl)
      .value;
    if (area) {
      res["area"] = area;
    }
    /*if (this.latitude) {
      res["latitude"] = this.latitude;
    }
    if (this.longitude) {
      res["longitude"] = this.longitude;
    }*/
    return res;
  }

  setSpatialCoverage(area: SpatialArea) {
    // console.log('set spatial coverage', area);
    /*this.latitude = {
      start: area.south,
      stop: area.north,
    };
    this.longitude = {
      start: area.west,
      stop: area.east,
    };*/
    // this.area = area;
    this.filterForm.controls.area.setValue(area);
    /*this.filterForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: true,
    });*/
  }

  private toFormGroup(data: ProductInfo) {
    let formGroup = this.fb.group({
      time_year: this.fb.array([]),
      time_month: this.fb.array([]),
      time_day: this.fb.array([]),
      time_hour: this.fb.array([]),
      format: ["netcdf", Validators.required],
      area: [null],
    });
    data.widgets_order.forEach((w) => {
      let comp = this.getWidget(w);
      if (comp.type === "StringList") {
        formGroup.addControl(comp.name, new FormArray([]));
      } else if (
        comp.type === "ExclusiveFrame" &&
        !["temporal_coverage", "spatial_coverage"].includes(comp.name)
      ) {
        formGroup.addControl(comp.name, new FormArray([]));
      }
    });
    return formGroup;
  }

  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Sort list of object alphabetically by field.
   * If the fields all end with a number, sort by that number.
   * E.g. R1,R2,...,R9,R10,R11,etc
   */
  sortBy(arr: any[], field: string) {
    if (!arr || arr.length === 0 || !arr[0].hasOwnProperty(field)) {
      return arr;
    }
    return arr.sort((a, b) => {
      let a1 = a[field].toLowerCase(),
        b1 = b[field].toLowerCase();
      const regex = /\d+$/;
      if (a1.match(regex) && b1.match(regex)) {
        const firstPartA = a1.replace(regex, ""),
          firstPartB = a1.replace(regex, "");
        if (firstPartA === firstPartB) {
          const an = Number(a1.match(regex)[0]),
            bn = Number(b1.match(regex)[0]);
          // compare numbers
          return an > bn ? 1 : an === bn ? 0 : -1;
        }
      }
      return a1.localeCompare(b1);
    });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
