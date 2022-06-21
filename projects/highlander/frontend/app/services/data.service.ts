import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { tap, map, share } from "rxjs/operators";
import { ApiService } from "@rapydo/services/api";
import { StorageUsage, DatasetInfo, ProductInfo, DateStruct } from "../types";
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: "root",
})
export class DataService {
  private _runPeriods: DateStruct[];

  constructor(private api: ApiService, private http: HttpClient) {}

  /**
   * Get all the available datasets.
   * @param isApplication filter ONLY application datasets.
   */
  getDatasets(isApplication?: boolean): Observable<DatasetInfo[]> {
    const params = isApplication ? { application: true } : {};
    return this.api.get<DatasetInfo[]>("/api/datasets", params);
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
   * Get crop-water geo data.
   */
  getShapefile(filename: string): Observable<any> {
    // FIXME retrieve data from geoserver
    return this.http
        .get(`/app/custom/assets/${filename}`, {
          responseType: 'arraybuffer'
        });
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
    const source$ = this.api.get<DateStruct[]>(
      `/api/datasets/${datasetId}/products/${productId}/ready`
    ).pipe(
        tap(val => {
          this._runPeriods = val as DateStruct[];
        }),
        share()
    );
    return (this._runPeriods) ? of(this._runPeriods) : source$;
  }

  readFileContent(file: File) {
    let fileReader: FileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    return Observable.create(observer => {
      fileReader.onloadend = () => {
        observer.next(fileReader.result);
        observer.complete();
      };
    });
  }
}
