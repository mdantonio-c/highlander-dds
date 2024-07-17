import { Component, Input } from "@angular/core";
import { ActivatedRoute, Router, Params } from "@angular/router";
import { DatasetInfo } from "../../types";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { DataService } from "../../services/data.service";
import { ViewModes } from "./dapos.config";

@Component({
  selector: "app-dapos",
  templateUrl: "./dapos.component.html",
  styleUrls: ["./dapos.component.scss"],
})
export class DaposComponent {
  dataset: DatasetInfo;
  lang = "en";
  viewMode: ViewModes = ViewModes.adv;
  modes = ViewModes;

  constructor(
    private dataService: DataService,
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private route: ActivatedRoute,
    private router: Router,
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
          },
        )
        .add(() => {
          this.spinner.hide();
        });
    }

    this.route.queryParams.subscribe((params: Params) => {
      const lang: string = params["lang"];
      if (lang) {
        if (["it", "en"].includes(lang)) {
          this.lang = lang;
        }
        console.log(`lang: ${this.lang}`);
      }
      const view: string = params["view"];
      if (view) {
        // check for valid view mode
        if (Object.values(ViewModes).includes(view)) {
          this.viewMode = ViewModes[view];
          console.log(`view mode: ${this.viewMode}`);
        } else {
          console.warn(`Invalid view param: ${view}`);
        }
      }
    });
  }
}
