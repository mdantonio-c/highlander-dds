import { Component } from "@angular/core";

// import { ContactsService } from "@app/services/{name}"

import { NgxSpinnerService } from "ngx-spinner";
import { ApiService } from "@rapydo/services/api";
import { AuthService } from "@rapydo/services/auth";
import { NotificationService } from "@rapydo/services/notification";

@Component({
  // selector: "contacts",
  templateUrl: "contacts.html",
})
export class ContactsComponent {
  constructor(
    private spinner: NgxSpinnerService,
    private api: ApiService,
    private auth: AuthService,
    private notify: NotificationService,
  ) {}
}
