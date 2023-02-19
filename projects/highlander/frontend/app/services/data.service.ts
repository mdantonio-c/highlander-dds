import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { tap, share } from "rxjs/operators";
import { ApiService } from "@rapydo/services/api";
import { StorageUsage, DatasetInfo, ProductInfo, DateStruct } from "../types";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "@rapydo/../environments/environment";

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

  getMapsUrl() {
    return this._maps_url;
  }

  /**
   * Get all the available datasets.
   * @param isApplication filter ONLY application datasets.
   */
  getDatasets(isApplication?: boolean): Observable<DatasetInfo[]> {
    const params = isApplication ? { application: true } : {};
    return this.api.get("/api/datasets", params);
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
    productId: string,
  ): Observable<ProductInfo> {
    return this.api.get(`/api/datasets/${datasetId}/products/${productId}`);
  }

  /**
   * Get administrative areas.
   * @param area
   */

  getGeojsonLayer(filename: string): Observable<any> {
    return this.api.get(`/api/geojson/${filename}`);
  }

  getFeatureInfo(bbox, width, height, x, y, queryLayers): Observable<any> {
    let params = {
      service: "WMS",
      version: "1.1.1",
      request: "GetFeatureInfo",
      query_layers: queryLayers,
      styles: ``,
      layers: queryLayers,
      info_format: "application/json",
      feature_count: "2",
      x: Math.round(x),
      y: Math.round(y),
      srs: "EPSG:4326",
      width: width,
      height: height,
      bbox: bbox,
    };

    return this.http.get(`${this._maps_url}/highlander/wms`, {
      params: params,
    });

    //return this.http.get(`${this._maps_url}/highlander/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&QUERY_LAYERS=${queryLayers}&STYLES=&LAYERS=${queryLayers}&INFO_FORMAT=application/json&FEATURE_COUNT=50&X=${x}&Y=${y}&SRS=EPSG:4326&WIDTH=${width}&HEIGHT=${height}&BBOX=${bbox}`)
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
      "application/json",
      "epsg:4326",
    );
    return this.http.get(`${this._maps_url}/ows`, { params: params });
  }

  private getOWSParams(
    workspace: string,
    datastore: string,
    outputFormat: string,
    srsName?: string,
  ) {
    let params = new HttpParams();
    params = params.append("service", "WFS");
    params = params.append("version", "1.0.0");
    params = params.append("request", "GetFeature");
    params = params.append("typeName", `${workspace}:${datastore}`);
    params = params.append("outputFormat", outputFormat);
    if (srsName) {
      params = params.append("srsName", srsName);
    }
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
    productId: string,
  ): Observable<DateStruct[]> {
    const source$ = this.api
      .get<DateStruct[]>(
        `/api/datasets/${datasetId}/products/${productId}/ready`,
      )
      .pipe(
        tap((val) => {
          this._runPeriods = val as DateStruct[];
        }),
        share(),
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
