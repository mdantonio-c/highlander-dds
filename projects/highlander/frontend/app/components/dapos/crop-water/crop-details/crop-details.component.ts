import { Component, Input, OnInit } from "@angular/core";
import { NgbActiveModal, NgbNavChangeEvent } from "@ng-bootstrap/ng-bootstrap";
import { DataService } from "../../../../services/data.service";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { CropWaterFilter } from "../../../../types";
import { CropInfo, LEGEND_DATA } from "../data";
import { LegendConfig } from "../../../../services/data";

@Component({
  selector: "hld-crop-details",
  templateUrl: "./crop-details.component.html",
  styleUrls: ["./crop-details.component.scss"],
})
export class CropDetailsComponent implements OnInit {
  @Input() crop: CropInfo;
  @Input() filter: CropWaterFilter;

  multi: any[];

  // options
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = true;
  showLegend: boolean = true;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = "Percentile";
  showYAxisLabel: boolean = true;
  yAxisLabel: string = "mm";
  legendTitle: string = "Products";

  active;

  constructor(
    private obsService: DataService,
    public activeModal: NgbActiveModal,
    private notify: NotificationService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    let multi = this.normalize();
    Object.assign(this, { multi });
  }

  colorScheme = {
    domain: ["#5AA454", "#C7B42C", "#AAAAAA"],
  };

  getCropType(): string {
    let legend: LegendConfig = LEGEND_DATA.find((x) => x.id === "crop");
    const idx = legend.ids.indexOf(this.crop.ID_CROP);
    if (idx !== -1) {
      return legend.labels[idx];
    }
    return "n/a";
  }

  private normalize() {
    /*
     * [{name: "", series: [{name:"", value:""}, ..]}, ...]
     */
    let multi = [];

    let irri: any[] = Object.entries(this.crop).filter(([key]) =>
      key.startsWith("irri_")
    );
    irri.forEach((val) => {
      let a = {
        name: val[0].split("_", 2)[1],
        series: [],
      };
      a.series.push({ name: "irri", value: val[1] });
      multi.push(a);
    });

    let prec = Object.entries(this.crop).filter(([key]) =>
      key.startsWith("prec_")
    );
    prec.forEach((val) => {
      let name = val[0].split("_", 2)[1];
      // find percentile and push the series
      const matched = multi.find((x) => x.name === name);
      if (matched) {
        matched.series.push({ name: "prec", value: val[1] });
      }
    });
    return multi;
  }
}
