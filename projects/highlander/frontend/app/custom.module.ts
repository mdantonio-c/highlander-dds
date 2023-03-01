import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { AuthGuard } from "@rapydo/app.auth.guard";
import { SharedModule } from "@rapydo/shared.module";
import { LeafletModule } from "@asymmetrik/ngx-leaflet";
import { LeafletDrawModule } from "@asymmetrik/ngx-leaflet-draw";
import { LeafletMarkerClusterModule } from "@asymmetrik/ngx-leaflet-markercluster";
import { NgxChartsModule } from "@swimlane/ngx-charts";

import { DatasetsComponent } from "./components/datasets/datasets.component";
import { ApplicationsComponent } from "./components/applications/applications.component";
import { DatasetCardComponent } from "./components/dataset-card/dataset-card.component";
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
import { SchedulesComponent } from "./components/admin/schedules/schedules.component";

import { SoilErosionComponent } from "./components/dapos/soil-erosion/soil-erosion.component";
import { CropWaterComponent } from "./components/dapos/crop-water/crop-water.component";
import { HumanWellbeingComponent } from "./components/dapos/human-wellbeing/human-wellbeing.component";
import { Era5DownscaledOverItalyComponent } from "./components/dapos/era5-downscaled-over-italy/era5-downscaled-over-italy.component";
import { SuitabilityForestComponent } from "./components/dapos/land-suitability-for-forests/suitability-forests.component";
import { SuitabilityVegetationComponent } from "./components/dapos/land-suitability-for-vegetation/suitability-vegetation.component";
import { WaterCycleComponent } from "./components/dapos/water-cycle/water-cycle.component";
import { SuitabilityVegetationChart } from "./components/dapos/land-suitability-for-vegetation/suitability-vegetation-chart/suitability-vegetation-chart.component";

import { MapFilterComponent as SoilErosionFilter } from "./components/dapos/soil-erosion/map-filter/map-filter.component";
import { MapDetailComponent as SoilErosionDetail } from "./components/dapos/soil-erosion/map-detail/map-detail.component";
import { MapFilterComponent as CropWaterFilter } from "./components/dapos/crop-water/map-filter/map-filter.component";
import { MapFilterComponent as HumanWellbeingFilter } from "./components/dapos/human-wellbeing/map-filter/map-filter.component";
import { MapDetailComponent as HumanWellbeingDetail } from "./components/dapos/human-wellbeing/map-detail/map-detail.component";
import { MapFilterComponent as Era5Filter } from "./components/dapos/era5-downscaled-over-italy/map-filter/map-filter.component";
import { MapDetailComponent as Era5Detail } from "./components/dapos/era5-downscaled-over-italy/map-detail/map-detail.component";
import { StripesComponent as Era5Stripes } from "./components/dapos/era5-downscaled-over-italy/stripes/stripes.component";
import { MapFilterComponent as SuitabilityForestFilter } from "./components/dapos/land-suitability-for-forests/map-filter/map-filter.component";
import { MapDetailComponent as SuitabilityForestDetail } from "./components/dapos/land-suitability-for-forests/map-detail/map-detail.component";
import { MapFilterComponent as SuitabilityVegetationFilter } from "./components/dapos/land-suitability-for-vegetation/map-filter/map-filter.component";
import { MapFilterComponent as WaterCycleFilter } from "./components/dapos/water-cycle/map-filter/map-filter.component";
import { MapDetailComponent as WaterCycleDetail } from "./components/dapos/water-cycle/map-detail/map-detail.component";

import { ReplacePipe } from "./pipes/replace.pipe";
import { AbsPipe } from "./pipes/abs.pipe";
import { ClickStopPropagation } from "./directives/click-stop-propagation";
import { EventStopPropagation } from "./directives/event-stop-propagation";
import { HolderjsDirective } from "./directives/holderjs";
import { FirstWordPipe } from "./pipes/first-word.pipe";
import { LastWordPipe } from "./pipes/last-word.pipe";
import { CropDetailsComponent } from "./components/dapos/crop-water/crop-details/crop-details.component";
import { UppercaseFilterPipe } from "./pipes/uppercase-filter.pipe";
import { StripesComponent } from "./components/dapos/era5-downscaled-over-italy/stripes/stripes.component";

import { ContactsComponent } from "./components/contacts/contacts";

import { DocumentationComponent } from "./components/documentation/documentation";

const routes: Routes = [
  { path: "app/datasets", component: DatasetsComponent },
  { path: "app/applications", component: DatasetsComponent },
  { path: "app/datasets/:ds_name", component: DatasetComponent },
  { path: "app/applications/:ds_name", component: DaposComponent },
  {
    path: "app/requests",
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "app/admin/schedules",
    component: SchedulesComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
    data: { roles: ["admin_root"] },
  },
  { path: "app", redirectTo: "/app/datasets", pathMatch: "full" },
  { path: "", redirectTo: "/app/datasets", pathMatch: "full" },
  { path: "public/contacts", component: ContactsComponent },
  { path: "public/documentation", component: DocumentationComponent },
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    LeafletModule,
    LeafletDrawModule,
    LeafletMarkerClusterModule,
    NgxChartsModule,
  ],
  declarations: [
    DocumentationComponent,
    ContactsComponent,
    DatasetsComponent,
    ApplicationsComponent,
    DatasetCardComponent,
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
    SchedulesComponent,
    SoilErosionComponent,
    CropWaterComponent,
    CropDetailsComponent,
    HumanWellbeingComponent,
    SuitabilityForestComponent,
    SuitabilityVegetationComponent,
    WaterCycleComponent,
    SuitabilityVegetationChart,
    Era5DownscaledOverItalyComponent,
    SoilErosionFilter,
    SoilErosionDetail,
    CropWaterFilter,
    HumanWellbeingFilter,
    HumanWellbeingDetail,
    Era5Filter,
    Era5Detail,
    Era5Stripes,
    SuitabilityForestFilter,
    SuitabilityForestDetail,
    SuitabilityVegetationFilter,
    WaterCycleFilter,
    WaterCycleDetail,
    ReplacePipe,
    AbsPipe,
    FirstWordPipe,
    LastWordPipe,
    UppercaseFilterPipe,
    ClickStopPropagation,
    EventStopPropagation,
    HolderjsDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
  exports: [RouterModule],
})
export class CustomModule {}
