import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { Dataset, StorageUsage, DatasetInfo, ProductInfo } from "../types";
import { WritableStream } from "web-streams-polyfill/ponyfill";
import streamSaver from "streamsaver";
import { environment } from "@rapydo/../environments/environment";
import { from } from "rxjs";
import { throwError } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class DataService {
  constructor(private api: ApiService) {}

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
    return this.api.get(`/api/datasets/${dataset_id}`);
  }

  /**
   *
   * @param dataset
   */
  submit(dataset: string, args: any): Observable<any> {
    return this.api.post(`/api/requests/${dataset}`, args);
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
   *
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
}
