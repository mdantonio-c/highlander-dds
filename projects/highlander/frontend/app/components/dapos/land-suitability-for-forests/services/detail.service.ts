import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, forkJoin, of } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { ForestSuitabilityMapCrop } from "../../../../types";
import { INDICATORS } from "../data";

@Injectable({
  providedIn: "root",
})
export class DetailService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getDetail(
    detailsFilter: ForestSuitabilityMapCrop,
    detailType: string
  ): Observable<Blob> {
    const options = {
      conf: {
        responseType: "blob",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      area_type: detailsFilter.area_type,
      type: detailType,
      area_id: detailsFilter.area_id,
    };
    if (detailType == "plot") {
      params["plot_type"] = "distribution";
    }
    return this.api.get(
      `/api/datasets/land-suitability-for-forests/products/${detailsFilter.product}/crop`,
      params,
      options
    );
  }

  getAllDetails(detailsFilter: ForestSuitabilityMapCrop): Observable<any[]> {
    const observables = [];
    const typeList = ["map", "plot"];
    for (let i = 0; i < typeList.length; i++) {
      observables.push(this.getDetail(detailsFilter, typeList[i]));
    }
    return forkJoin(observables);
  }
}
