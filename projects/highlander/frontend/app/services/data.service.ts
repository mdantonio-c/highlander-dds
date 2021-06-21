import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { Dataset, StorageUsage } from "@app/types";

@Injectable({
  providedIn: "root",
})
export class DataService {
  constructor(private api: ApiService) {}

  /**
   * Get all the available datasets.
   */
  getDatasets(): Observable<Dataset[]> {
    return this.api.get("/api/datasets");
  }

  /**
   * Get a dataset by name.
   * @param name
   */
  getDataset(name: string): Observable<Dataset> {
    return this.api.get(`/api/datasets/${name}`);
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
    // return this.api.get("/api/usage");
    return of({ quota: 524288000, used: 10180754 });
  }
}
