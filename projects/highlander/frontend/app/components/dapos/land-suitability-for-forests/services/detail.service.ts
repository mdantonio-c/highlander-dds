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
    detailType: string,
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
    let product = "";
    if (detailsFilter.period === "1991_2020") {
      product = `${detailsFilter.product}-hist`;
    } else {
      product = `${detailsFilter.product}-proj`;
    }
    return this.api.get(
      `/api/datasets/land-suitability-for-forests/products/${product}/crop`,
      params,
      options,
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
  createReport(
    detailsFilter: ForestSuitabilityMapCrop,
    productLabel: string,
    indicatorLabel: string,
  ): Observable<any> {
    const options = {
      conf: {
        responseType: "blob",
        observe: "response",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      area_type: detailsFilter.area_type,
      area_id: detailsFilter.area_id,
    };

    let product = "";
    if (detailsFilter.period === "1991_2020") {
      product = `${detailsFilter.product}-hist`;
    } else {
      product = `${detailsFilter.product}-proj`;
    }

    // create the label
    params[
      "label"
    ] = `${productLabel} - ${indicatorLabel} - ${detailsFilter.period} `;

    return this.api.get(
      `/api/datasets/land-suitability-for-forests/products/${product}/report`,
      params,
      options,
    );
  }
}
