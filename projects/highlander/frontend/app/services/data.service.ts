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
    return this.api.get("datasets");
  }

  /**
   * Get a dataset by name.
   * @param name
   */
  getDataset(name: string): Observable<Dataset> {
    return this.api.get(`datasets/${name}`);
  }
}
