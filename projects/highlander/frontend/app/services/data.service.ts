import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { Dataset } from "@app/types";

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
  submit(dataset: string): Observable<any> {
    return this.api.post(`/api/requests/${dataset}`);
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
}
