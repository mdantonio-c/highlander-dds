import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import {
  DatasetInfo,
  DatasetVariables,
  ProductInfo,
  Widget,
} from "../../types";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from "@angular/forms";

@Component({
  selector: "data-extraction-modal",
  templateUrl: "./data-extraction-modal.component.html",
})
export class DataExtractionModalComponent implements OnInit {
  @Input() dataset: DatasetInfo;
  @Input() productId: string;
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  productName: string;
  filterForm: FormGroup;
  productInfo: ProductInfo;
  active = 1;

  constructor(
    public activeModal: NgbActiveModal,
    private dataService: DataService,
    private fb: FormBuilder,
    private notify: NotificationService,
    private spinner: NgxSpinnerService
  ) {
    this.filterForm = this.fb.group({
      variable: this.fb.array([]),
      time_year: this.fb.array([]),
      time_month: this.fb.array([]),
      time_day: this.fb.array([]),
      time_hour: this.fb.array([]),
      format: ["netcdf", Validators.required],
    });
  }

  ngOnInit() {
    console.log(`Product ID: ${this.productId}`);
    // console.log(this.dataset);
    this.spinner.show("extSpinner");
    this.dataService
      .getDatasetProduct(this.dataset.id, this.productId)
      .subscribe(
        (data) => {
          this.productInfo = data;
          this.productName = this.productInfo.label;
        },
        (error) => {
          this.notify.showError(error);
        }
      )
      .add(() => {
        this.spinner.hide("extSpinner");
      });
  }

  getWidget(widgetName: string): Widget {
    if (!this.productInfo) return;
    return this.productInfo.widgets.find((w) => w.name == widgetName);
  }

  onListChange(e, filter) {
    const checkArray: FormArray = this.filterForm.get(filter) as FormArray;
    if (!checkArray) {
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
    const res = {
      product: this.productId,
      variables: (this.filterForm.controls.variable as FormArray).value,
      format: this.filterForm.controls.format.value,
    };
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
    this.passEntry.emit(res);
    this.activeModal.close();
  }
}
