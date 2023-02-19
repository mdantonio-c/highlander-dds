import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, forkJoin } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { SoilErosionMapCrop } from "../../../../types";

@Injectable({
  providedIn: "root",
})
export class DetailService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getDetail(
    detailsFilter: SoilErosionMapCrop,
    detailType: string,
  ): Observable<Blob> {
    const options = {
      conf: {
        responseType: "blob",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      model_id: detailsFilter.model,
      area_type: detailsFilter.area_type,
      type: detailType,
      area_id: detailsFilter.area_id,
    };
    if (detailType == "plot") {
      params["plot_type"] = "distribution";
    }
    let product = "";
    if (detailsFilter.period === "1991_2020") {
      product = detailsFilter.product;
    } else {
      product = `${detailsFilter.product}-anomalies`;
    }
    return this.api.get(
      `/api/datasets/soil-erosion/products/${product}/crop`,
      params,
      options,
    );
  }

  getAllDetails(detailsFilter: SoilErosionMapCrop): Observable<any[]> {
    const observables = [];
    const typeList = ["map", "plot"];
    for (let i = 0; i < typeList.length; i++) {
      observables.push(this.getDetail(detailsFilter, typeList[i]));
    }
    return forkJoin(observables);
  }

  createReport(
    detailsFilter: SoilErosionMapCrop,
    productLabel: string,
  ): Observable<any> {
    const options = {
      conf: {
        responseType: "blob",
        observe: "response",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      model_id: detailsFilter.model,
      area_type: detailsFilter.area_type,
      area_id: detailsFilter.area_id,
    };

    let product = "";
    if (detailsFilter.period === "1991_2020") {
      product = detailsFilter.product;
    } else {
      product = `${detailsFilter.product}-anomalies`;
    }

    // create the label
    params[
      "label"
    ] = `${productLabel} - ${detailsFilter.model} - ${detailsFilter.period} `;

    return this.api.get(
      `/api/datasets/soil-erosion/products/${product}/report`,
      params,
      options,
    );
  }
}