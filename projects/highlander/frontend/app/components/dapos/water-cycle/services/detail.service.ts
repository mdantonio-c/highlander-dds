import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { ApiService } from "@rapydo/services/api";

@Injectable({
  providedIn: "root",
})
export class DetailService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getJsonData(filename: string): Observable<any> {
    return this.api.get(`/api/datasets/water-cycle/json/${filename}`);
  }
}
