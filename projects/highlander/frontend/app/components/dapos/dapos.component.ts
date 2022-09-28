import { Component, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DatasetInfo } from "../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { DataService } from "../../services/data.service";

@Component({
  selector: "app-dapos",
  templateUrl: "./dapos.component.html",
  styleUrls: ["./dapos.component.scss"],
})
export class DaposComponent {
  dataset: DatasetInfo;

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.dataset = this.router.getCurrentNavigation().extras
      .state as DatasetInfo;
  }

  ngOnInit() {
    const datasetName = this.route.snapshot.paramMap.get("ds_name");
    if (!datasetName) {
      this.notify.showError("ds_name parameter not found");
      return;
    }

    if (!this.dataset) {
      // console.log(`load dataset <${dataset_name}>`);
      this.spinner.show();
      this.dataService
        .getDataset(datasetName)
        .subscribe(
          (data) => {
            this.dataset = data;
          },
          (error) => {
            this.router.navigate(["app/404"]);
            this.notify.showError(error);
          }
        )
        .add(() => {
          this.spinner.hide();
        });
    }
  }
}
