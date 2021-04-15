import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { SharedModule } from "@rapydo/shared.module";
import { AuthGuard } from "@rapydo/app.auth.guard";

import { DatasetsComponent } from "./components/datasets/datasets.component";

const routes: Routes = [
  { path: "app/datasets", component: DatasetsComponent },
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
  declarations: [DatasetsComponent],

  providers: [],

  exports: [RouterModule],
})
export class CustomModule {}
