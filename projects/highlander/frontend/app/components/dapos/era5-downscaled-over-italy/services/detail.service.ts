import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, forkJoin, of } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { Era5MapCrop } from "../../../../types";

@Injectable({
  providedIn: "root",
})
export class DetailService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getDetail(
    detailsFilter: Era5MapCrop,
    detailType: string
  ): Observable<Blob> {
    const options = {
      conf: {
        responseType: "blob",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      time_period: detailsFilter.time_period,
      area_type: detailsFilter.area_type,
      type: detailType,
      area_id: detailsFilter.area_id,
    };
    console.log("print params");
    console.log(params);

    // if (detailsFilter.year) {
    //   params["year"] = detailsFilter.year;
    // }
    // if (detailsFilter.date) {
    //   params["date"] = detailsFilter.date;
    // }

    if (detailType == "plot") {
      params["plot_type"] = "distribution";
    }
    return this.api.get(
      `/api/datasets/era5-downscaled-over-italy/products/VHR-REA_IT_1989_2020/crop`,
      params,
      options
    );
  }

  getAllDetails(detailsFilter: Era5MapCrop): Observable<any[]> {
    const observables = [];
    const typeList = ["map", "plot"];
    for (let i = 0; i < typeList.length; i++) {
      observables.push(this.getDetail(detailsFilter, typeList[i]));
    }
    return forkJoin(observables);
  }
}
