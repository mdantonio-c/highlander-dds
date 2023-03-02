import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, forkJoin, of } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { HumanWellbeingMapCrop } from "../../../../types";

@Injectable({
  providedIn: "root",
})
export class DetailService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getDetail(
    detailsFilter: HumanWellbeingMapCrop,
    detailType: string,
  ): Observable<Blob> {
    const options = {
      conf: {
        responseType: "blob",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      daily_metric: detailsFilter.daily_metric,
      area_type: detailsFilter.area_type,
      type: detailType,
      area_id: detailsFilter.area_id,
    };
    if (detailsFilter.year) {
      params["year"] = detailsFilter.year;
    }
    if (detailsFilter.date) {
      params["date"] = detailsFilter.date;
    }
    if (detailsFilter.product == "anomalies") {
      params["time_period"] = detailsFilter.time_period;
    }

    if (detailType == "plot") {
      params["plot_type"] = "distribution";
    }
    return this.api.get(
      `/api/datasets/human-wellbeing/products/${detailsFilter.product}/crop`,
      params,
      options,
    );
  }

  getAllDetails(detailsFilter: HumanWellbeingMapCrop): Observable<any[]> {
    const observables = [];
    const typeList = ["map", "plot"];
    for (let i = 0; i < typeList.length; i++) {
      observables.push(this.getDetail(detailsFilter, typeList[i]));
    }
    return forkJoin(observables);
  }
  createReport(
    detailsFilter: HumanWellbeingMapCrop,
    productLabel: string,
    dateLabel: string,
    timePeriodlabel: string,
  ): Observable<any> {
    const options = {
      conf: {
        responseType: "blob",
        observe: "response",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      daily_metric: detailsFilter.daily_metric,
      area_type: detailsFilter.area_type,
      area_id: detailsFilter.area_id,
    };

    if (detailsFilter.product == "anomalies") {
      params["time_period"] = detailsFilter.time_period;
    } else {
      if (detailsFilter.year) {
        params["year"] = detailsFilter.year;
      }
      if (detailsFilter.date) {
        params["date"] = detailsFilter.date;
      }
    }

    // check if a time period is needed
    params[
      "label"
    ] = `${productLabel} - ${detailsFilter.product} - ${detailsFilter.daily_metric} ${timePeriodlabel} `;
    if (dateLabel && detailsFilter.product !== "anomalies") {
      params[
        "label"
      ] = `${productLabel} - ${detailsFilter.product} - ${detailsFilter.daily_metric} - Day: ${dateLabel}`;
    }

    return this.api.get(
      `/api/datasets/human-wellbeing/products/${detailsFilter.product}/report`,
      params,
      options,
    );
  }
}
