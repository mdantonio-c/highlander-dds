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
import { SpatialCoverageComponent } from "./components/data-extraction-modal/spatial-coverage/spatial-coverage.component";
import { TemporalCoverageComponent } from "./components/data-extraction-modal/temporal-coverage/temporal-coverage.component";
import { ExclusiveFrameComponent } from "./components/data-extraction-modal/exclusive-frame/exclusive-frame.component";
import { MapSideNavComponent } from "./components/data-extraction-modal/map-side-nav/map-side-nav.component";
import { RequestsComponent } from "./components/requests/requests.component";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { StorageUsageComponent } from "./components/dashboard/storage-usage/storage-usage.component";
import { DaposComponent } from "./components/dapos/dapos.component";
import { SoilErosionComponent } from "./components/dapos/soil-erosion/soil-erosion.component";
import { CropWaterComponent } from "./components/dapos/crop-water/crop-water.component";
import { HumanWellbeingComponent } from "./components/dapos/human-wellbeing/human-wellbeing.component";
import { MapFilterComponent as SoilErosionFilter } from "./components/dapos/soil-erosion/map-filter/map-filter.component";
import { MapFilterComponent as CropWaterFilter } from "./components/dapos/crop-water/map-filter/map-filter.component";
import { MapFilterComponent as HumanWellbeingFilter } from "./components/dapos/human-wellbeing/map-filter/map-filter.component";
import { ReplacePipe } from "./pipes/replace.pipe";
import { AbsPipe } from "./pipes/abs.pipe";
import { ClickStopPropagation } from "./directives/click-stop-propagation";

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
    component: DaposComponent,
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
    SpatialCoverageComponent,
    TemporalCoverageComponent,
    ExclusiveFrameComponent,
    MapSideNavComponent,
    RequestsComponent,
    DashboardComponent,
    StorageUsageComponent,
    DaposComponent,
    SoilErosionComponent,
    CropWaterComponent,
    HumanWellbeingComponent,
    SoilErosionFilter,
    CropWaterFilter,
    HumanWellbeingFilter,
    ReplacePipe,
    AbsPipe,
    ClickStopPropagation,
  ],
  schemas: [],
  providers: [],
  exports: [RouterModule],
})
export class CustomModule {}
