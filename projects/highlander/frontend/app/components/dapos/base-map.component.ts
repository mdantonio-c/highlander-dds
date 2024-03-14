import { Component, OnInit, Input, OnDestroy, Injector } from "@angular/core";
import * as L from "leaflet";
import { NotificationService } from "@rapydo/services/notification";
import { SharedService } from "@rapydo/services/shared-service";
import { NgxSpinnerService } from "ngx-spinner";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { map } from "rxjs";
import { ViewModes } from "./dapos.config";

@Component({
  selector: "hld-base-map",
  template: "",
})
export abstract class BaseMapComponent implements OnInit, OnDestroy {
  map: L.Map;
  modes = ViewModes;
  viewMode = ViewModes.adv;
  iframeMode = false;
  lang = "en";

  protected notify: NotificationService;
  protected spinner: NgxSpinnerService;
  protected router: Router;
  protected route: ActivatedRoute;
  protected sharedService: SharedService;

  protected constructor(injector: Injector) {
    this.notify = injector.get(NotificationService);
    this.spinner = injector.get(NgxSpinnerService);
    this.router = injector.get(Router);
    this.route = injector.get(ActivatedRoute);
    this.sharedService = injector.get(SharedService);
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => {
          const value = params.get("iframe");
          return value ? value.toLocaleLowerCase() === "true" : false;
        }),
      )
      .subscribe((iframe) => {
        if (!iframe) return;
        this.sharedService.emitChange(true);
      });
  }

  ngOnDestroy() {
    if (null != this.map) {
      this.map.remove();
    }
  }

  protected abstract onMapReady(map: L.Map);

  protected onMapZoomEnd($event) {
    // console.log(`Map Zoom: ${this.map.getZoom()}`);
    // DO NOTHING
  }
}
