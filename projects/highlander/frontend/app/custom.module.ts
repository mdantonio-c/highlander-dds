import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { SharedModule } from "@rapydo/shared.module";
import { AuthGuard } from "@rapydo/app.auth.guard";

import { DatasetsComponent } from "./components/datasets/datasets.component";
import { DatasetComponent } from "./components/dataset/dataset.component";
import { DataExtractionModalComponent } from "./components/data-extraction-modal/data-extraction-modal.component";

const routes: Routes = [
  { path: "app/datasets", component: DatasetsComponent },
  { path: "app/datasets/:ds_name", component: DatasetComponent },
  {
    path: "",
    redirectTo: "/app/datasets",
    pathMatch: "full",
  },
  {
    path: "app",
    redirectTo: "/app/datasets",
    pathMatch: "full",
  },
  /*
  {
    path: "app/myroute",
    component: MyComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: "always",
  },
*/
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [
    DatasetsComponent,
    DatasetComponent,
    DataExtractionModalComponent,
  ],
  providers: [],
  exports: [RouterModule],
})
export class CustomModule {}
