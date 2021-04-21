import { Component, OnInit } from "@angular/core";
import { DataService } from "@app/services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { Dataset } from "@app/types";
import { Observable } from "rxjs";

@Component({
  selector: "app-datasets",
  templateUrl: "./datasets.component.html",
  styleUrls: ["./datasets.component.css"],
})
export class DatasetsComponent implements OnInit {
  readonly title = "Datasets";
  loading: boolean = false;
  datasets: Dataset[] = [];

  constructor(
    private dataService: DataService,
    private notify: NotificationService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.loadDatasets();
  }

  private loadDatasets() {
    this.loading = true;
    this.spinner.show();
    this.dataService
      .getDatasets()
      .subscribe(
        (data) => {
          this.datasets = data;
          console.log(this.datasets);
        },
        (error) => {
          this.notify.showError(error);
        }
      )
      .add(() => {
        this.loading = false;
        this.spinner.hide();
      });
  }
}
