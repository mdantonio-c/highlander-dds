import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { SharedModule } from "@rapydo/shared.module";

import { DatasetsComponent } from "./components/datasets/datasets.component";
import { DatasetComponent } from "./components/dataset/dataset.component";
import { DataExtractionModalComponent } from "./components/data-extraction-modal/data-extraction-modal.component";

const routes: Routes = [
  { path: "app/datasets", component: DatasetsComponent },
  { path: "app/datasets/:ds_name", component: DatasetComponent },
  { path: "app", redirectTo: "/app/datasets", pathMatch: "full" },
  { path: "", redirectTo: "/app/datasets", pathMatch: "full" },
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
