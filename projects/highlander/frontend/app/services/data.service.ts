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
   * Stream large blob file using StreamSaver.js
   * Note: streaming response body of fetch is not compatible with all browsers.
   * web-streams-polyfill is used to overcome this limitation.
   * @param filename
   * @param timestamp
   * @param token
   */
  downloadStreamData(
    filename: string,
    timestamp: string,
    token: string
  ): Observable<any> {
    const url = `${environment.backendURI}/api/download/${timestamp}`;
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
    });

    const request = new Request(url, {
      method: "GET",
      headers: headers,
    });

    return Observable.create((observer) => {
      fetch(request)
        .then((res) => {
          if (res.ok) {
            // If the WritableStream is not available (Firefox, Safari), take it from the polyfill
            if (!window.WritableStream) {
              streamSaver.WritableStream = WritableStream;
              window.WritableStream = WritableStream;
            }

            const readableStream = res.body;
            const fileStream = streamSaver.createWriteStream(filename);

            // More optimized
            if (readableStream.pipeTo) {
              return readableStream.pipeTo(fileStream);
            }

            window.writer = fileStream.getWriter();
            const reader = res.body.getReader();
            const pump = () =>
              reader
                .read()
                .then((res) =>
                  res.done
                    ? window.writer.close()
                    : window.writer.write(res.value).then(pump)
                );

            pump();
          } else {
            return res.text().then((msg) => {
              throw new Error(msg);
            });
          }
        })
        .catch((error) => observer.error(error));
    });
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
