import { Component, OnInit } from "@angular/core";
import { DataService } from "../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { DatasetInfo } from "../../types";
import { SSRService } from "@rapydo/services/ssr";

@Component({
  selector: "app-datasets",
  templateUrl: "./datasets.component.html",
  styleUrls: ["./datasets.component.css"],
})
export class DatasetsComponent implements OnInit {
  datasets: DatasetInfo[];

  constructor(
    private dataService: DataService,
    private notify: NotificationService,
    private spinner: NgxSpinnerService,
    public ssr: SSRService
  ) {}

  ngOnInit() {
    if (this.ssr.isBrowser) {
      this.loadDatasets();
    }
  }

  private loadDatasets() {
    this.spinner.show();
    this.dataService
      .getDatasets()
      .subscribe(
        (data) => {
          this.datasets = data;
        },
        (error) => {
          this.notify.showError(error);
        }
      )
      .add(() => {
        this.spinner.hide();
      });
  }
}
