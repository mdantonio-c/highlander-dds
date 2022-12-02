import { Component, Input, OnChanges, ChangeDetectorRef } from "@angular/core";
import { NotificationService } from "@rapydo/services/notification";
import { NgxSpinnerService } from "ngx-spinner";
import { TIMERANGES } from "../data";
import { SuitabilityVegetationChartData } from "../../../../types";

@Component({
  selector: "suitability-vegetation-chart",
  templateUrl: "./suitability-vegetation-chart.component.html",
  styleUrls: ["./suitability-vegetation-chart.component.scss"],
})
export class SuitabilityVegetationChart implements OnChanges {
  @Input() pointValues;
  @Input() isPointSelected;
  @Input() indicator;

  loading = false;
  chartData: SuitabilityVegetationChartData[];
  // chart options
  colorScheme = {
    domain: ["#1a7dc1", "#aae3f5"],
  };

  constructor(
    protected notify: NotificationService,
    protected spinner: NgxSpinnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges() {
    /*          setTimeout(() => {
        this.spinner.show("chart-spinner");
      }, 0);*/
    if (this.isPointSelected && this.pointValues) {
      //this.loading = true;
      this.chartData = this.normalizeData();
      //console.log("creating chart for:", chartData);
      //this.spinner.hide("chart-spinner");
    }
  }

  normalizeData() {
    let normalizedData = [];
    for (let i = 0; i < TIMERANGES.length; i++) {
      let singleData = {};
      singleData["name"] = TIMERANGES[i];
      singleData["value"] = this.pointValues[i].toFixed(2);
      normalizedData.push(singleData);
    }
    return normalizedData;
  }
}
