import { Injectable } from "@angular/core";
import { FormlyFieldConfig } from "@ngx-formly/core";
import { BaseProjectOptions } from "@rapydo/base.project.options";
import { AdminMenu, User } from "@rapydo/types";
import { BytesPipe } from "@rapydo/pipes/bytes";

@Injectable()
export class ProjectOptions extends BaseProjectOptions {
  private terms_of_use: string;

  constructor() {
    super();
    this.initTemplates();
  }

  privacy_statements() {
    return [{ label: "Terms of Use", text: this.terms_of_use }];
  }

  custom_user_data(): any[] {
    return [
      {
        name: "Disk<br>Quota",
        prop: "disk_quota",
        flexGrow: 0.3,
        pipe: new BytesPipe(),
      },
    ];
  }

  cookie_law_text(): string {
    // return null to enable default text
    return null;
  }

  cookie_law_button(): string {
    // return null to enable default text
    return null;
  }

  registration_disclaimer(): string {
    return null;
  }

  admin_menu_entries(user: User): AdminMenu[] {
    // return [
    //   {
    //     enabled: user.isAdmin,
    //     label: "MyLabel",
    //     router_link: "/app/admin/myroute",
    //   },
    // ];

    return [];
  }

  private initTemplates() {
    this.terms_of_use = `
This is a default text, something like a lorem ipsum placeholder. 
You should never visualize this text in a production environment. <br/>
If you are reading this text your terms of use are missing in your customization component <br/>
Please customize this text in your initTemplates (in customization.ts)<br />
<br/>
<br/>
`;
  }
}
