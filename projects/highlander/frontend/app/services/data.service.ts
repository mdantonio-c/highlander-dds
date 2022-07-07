import { Injectable } from "@angular/core";
import { Observable, of, iif, concat, merge, zip } from "rxjs";
import { tap, share, mergeMap, map, concatMap, expand } from "rxjs/operators";
import { ApiService } from "@rapydo/services/api";
import { StorageUsage, DatasetInfo, ProductInfo, DateStruct } from "../types";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "@rapydo/../environments/environment";
import { ADDITIONAL_APPLICATIONS } from "./data.mock";

@Injectable({
  providedIn: "root",
})
export class DataService {
  private _runPeriods: DateStruct[];
  private readonly _maps_url: string;

  constructor(private api: ApiService, private http: HttpClient) {
    this._maps_url = environment.CUSTOM.MAPS_URL;
    console.info(`Map server URL: ${this._maps_url}`);
    if (!this._maps_url) {
      throw new Error("Missing MAPS_URL config");
    }
  }

  /**
   * Get all the available datasets.
   * @param isApplication filter ONLY application datasets.
   */
  getDatasets(isApplication?: boolean): Observable<DatasetInfo[]> {
    // const params = isApplication ? { application: true } : {};
    //return this.api.get("/api/datasets", params);
    return isApplication
      ? zip(
          this.api.get<DatasetInfo[]>("/api/datasets", { application: true }),
          of(ADDITIONAL_APPLICATIONS)
        ).pipe(map((x) => (x[0] as DatasetInfo[]).concat(x[1])))
      : this.api.get<DatasetInfo[]>("/api/datasets");
  }

  /**
   * Get a dataset by id.
   * @param dataset_id
   */
  getDataset(dataset_id: string): Observable<DatasetInfo> {
    return this.api.get<DatasetInfo>(`/api/datasets/${dataset_id}`);
  }

  /**
   * Submit data request.
   * @param dataset
   */
  submit(dataset: string, args: any): Observable<any> {
    return this.api.post(`/api/requests/${dataset}`, args);
  }

  /**
   * Get size estimate.
   */
  getSizeEstimate(dataset: string, args: any): Observable<number> {
    // return of(Math.floor(Math.random() * 100));
    return this.api.post(`/api/estimate-size/${dataset}`, args);
  }

  /**
   * Download data for a completed extraction request
   */
  downloadData(filename): Observable<any> {
    const options = {
      conf: {
        responseType: "blob",
        observe: "response",
      },
    };
    return this.api.get(`/api/download/${filename}`, {}, options);
  }

  /**
   * Get user storage info.
   */
  getStorageUsage(): Observable<StorageUsage> {
    return this.api.get("/api/usage");
  }

  /**
   * Get a dataset product info.
   * @param datasetId
   * @param productId
   */
  getDatasetProduct(
    datasetId: string,
    productId: string
  ): Observable<ProductInfo> {
    return this.api.get(`/api/datasets/${datasetId}/products/${productId}`);
  }

  /**
   * Get administrative areas.
   * @param area
   */
  getAdministrativeAreas(area = "regions"): Observable<any> {
    return this.http.get(`/app/custom/assets/geojson/italy-${area}.json`);
  }

  /**
   * Get crop-water zipped shapefile data.
   * @param datastore
   */
  getZippedShapefile(datastore: string): Observable<any> {
    const params = this.getOWSParams("highlander", datastore, "shape-zip");
    return this.http.get(`${this._maps_url}/ows`, {
      params: params,
      responseType: "arraybuffer",
    });
  }

  /**
   * Get crop-water geojson data.
   * @param datastore
   */
  getGeoJson(datastore: string): Observable<any> {
    const params = this.getOWSParams(
      "highlander",
      datastore,
      "application/json"
    );
    return this.http.get(`${this._maps_url}/ows`, { params: params });
  }

  private getOWSParams(
    workspace: string,
    datastore: string,
    outputFormat: string
  ) {
    let params = new HttpParams();
    params = params.append("service", "WFS");
    params = params.append("version", "1.0.0");
    params = params.append("request", "GetFeature");
    params = params.append("typeName", `${workspace}:${datastore}`);
    params = params.append("outputFormat", outputFormat);
    return params;
  }

  /**
   * Get available run for a give dataset product.
   * Used for Crop-water dataset.
   * @param datasetId
   * @param productId
   */
  getRunPeriods(
    datasetId: string,
    productId: string
  ): Observable<DateStruct[]> {
    const source$ = this.api
      .get<DateStruct[]>(
        `/api/datasets/${datasetId}/products/${productId}/ready`
      )
      .pipe(
        tap((val) => {
          this._runPeriods = val as DateStruct[];
        }),
        share()
      );
    return this._runPeriods ? of(this._runPeriods) : source$;
  }

  readFileContent(file: File) {
    let fileReader: FileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    return Observable.create((observer) => {
      fileReader.onloadend = () => {
        observer.next(fileReader.result);
        observer.complete();
      };
    });
  }
}
