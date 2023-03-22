import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, forkJoin, of } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { Era5MapCrop, Era5Stripes } from "../../../../types";

@Injectable({
  providedIn: "root",
})
export class DetailService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getDetail(detailsFilter: Era5MapCrop, detailType: string): Observable<Blob> {
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
      reference_period: detailsFilter.period,
    };
    console.log("print params");
    console.log(params);

    if (detailType == "stripes") {
      let params = {
        time_period: detailsFilter.time_period,
        administrative: detailsFilter.area_type,
        area_id: detailsFilter.area_id,
        indicator: detailsFilter.indicator,
        reference_period: detailsFilter.period,
      };
      // call the stripes API
      return this.api.get(
        `/api/datasets/era5-downscaled-over-italy/stripes`,
        params,
        options,
      );
    }
    return this.api.get(
      `/api/datasets/era5-downscaled-over-italy/products/VHR-REA_IT_1981_2020/crop`,
      params,
      options,
    );
  }

  getAllDetails(detailsFilter: Era5MapCrop): Observable<any[]> {
    const observables = [];
    const typeList = ["map", "stripes"];
    for (let i = 0; i < typeList.length; i++) {
      observables.push(this.getDetail(detailsFilter, typeList[i]));
    }
    return forkJoin(observables);
  }

  getStripes(stripesDetails: Era5Stripes): Observable<any[]> {
    const options = {
      conf: {
        responseType: "blob",
      },
    };
    let params = {
      administrative: "Italy",
      time_period: stripesDetails.time_period,
      indicator: stripesDetails.indicator,
      reference_period: stripesDetails.period,
    };
    const obs = this.api.get(
      `/api/datasets/era5-downscaled-over-italy/stripes`,
      params,
      options,
    );
    return forkJoin(obs);
  }
  createReport(
    detailsFilter: Era5MapCrop,
    productLabel: string,
    dateLabel: string,
  ): Observable<any> {
    const options = {
      conf: {
        responseType: "blob",
        observe: "response",
      },
    };
    let params = {
      indicator: detailsFilter.indicator,
      time_period: detailsFilter.time_period,
      area_type: detailsFilter.area_type,
      area_id: detailsFilter.area_id,
      reference_period: detailsFilter.period,
    };

    // create the label
    params["label"] = `${productLabel} - ${dateLabel} `;

    return this.api.get(
      `/api/datasets/era5-downscaled-over-italy/products/VHR-REA_IT_1981_2020/report`,
      params,
      options,
    );
  }
}
