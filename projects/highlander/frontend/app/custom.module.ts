import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { AuthGuard } from "@rapydo/app.auth.guard";
import { SharedModule } from "@rapydo/shared.module";
import { LeafletModule } from "@asymmetrik/ngx-leaflet";
import { LeafletDrawModule } from "@asymmetrik/ngx-leaflet-draw";
import { LeafletMarkerClusterModule } from "@asymmetrik/ngx-leaflet-markercluster";

import { DatasetsComponent } from "./components/datasets/datasets.component";
import { DatasetComponent } from "./components/dataset/dataset.component";
import { DataExtractionModalComponent } from "./components/data-extraction-modal/data-extraction-modal.component";
import { RequestsComponent } from "./components/requests/requests.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { StorageUsageComponent } from "./components/dashboard/storage-usage/storage-usage.component";
import { ForecastMapsComponent } from "./components/maps/forecast-maps/forecast-maps.component";
import { MapFilterComponent } from "./components/maps/forecast-maps/map-filter/map-filter.component";
import { ReplacePipe } from "./pipes/replace.pipe";
import { AbsPipe } from "./pipes/abs.pipe";

const routes: Routes = [
  { path: "app/datasets", component: DatasetsComponent },
  { path: "app/applications", component: DatasetsComponent },
  { path: "app/datasets/:ds_name", component: DatasetComponent },
  {
    path: "app/requests",
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "app/applications/:ds_name",
    component: ForecastMapsComponent,
    canActivate: [AuthGuard],
  },
  { path: "app", redirectTo: "/app/datasets", pathMatch: "full" },
  { path: "", redirectTo: "/app/datasets", pathMatch: "full" },
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    LeafletModule,
    LeafletDrawModule,
    LeafletMarkerClusterModule,
  ],
  declarations: [
    DatasetsComponent,
    DatasetComponent,
    DataExtractionModalComponent,
    RequestsComponent,
    DashboardComponent,
    StorageUsageComponent,
    ForecastMapsComponent,
    MapFilterComponent,
    ReplacePipe,
    AbsPipe,
  ],
  schemas: [],
  providers: [],
  exports: [RouterModule],
})
export class CustomModule {}
