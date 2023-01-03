import { Component, Output, Injector, EventEmitter } from "@angular/core";

import { AdminService } from "../../../services/admin.service";
import { Schedule, Schedules } from "../../../types";
import { BasePaginationComponent } from "@rapydo/components/base.pagination.component";
import { ConfirmationModals } from "@rapydo/services/confirmation.modals";

import { Subject } from "rxjs";
import { take } from "rxjs/operators";

enum ColumnMode {
  standard = "standard",
  flex = "flex",
  force = "force",
}

@Component({
  templateUrl: "schedules.component.html",
})
export class SchedulesComponent extends BasePaginationComponent<Schedules> {
  protected confirmationModals: ConfirmationModals;
  ColumnMode = ColumnMode;
  @Output() onLoad: EventEmitter<null> = new EventEmitter<null>();

  constructor(
    protected injector: Injector,
    private adminService: AdminService,
  ) {
    super(injector);
    this.init("schedule", "/api/admin/schedules", "Schedules");
    this.initPaging();
    this.list();
  }

  list(): Subject<boolean> {
    const subject = super.list();

    subject.pipe(take(1)).subscribe((success: boolean) => {
      this.onLoad.emit();
    });
    return subject;
  }

  stopPropagation(event: Event) {
    console.log(event);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Enable or disable the corresponding schedule
   * @param event
   * @param schedule
   */
  toggleStatus(event: Event, schedule: Schedule) {
    // stop event propagation
    event.preventDefault();
    event.stopPropagation();

    const action: string = schedule.is_enabled ? "disable" : "enable";
    this.confirmationModals
      .open({
        text: `Are you really sure you want to ${action} this schedule?`,
        subText: " ",
        confirmButton: `Yes, ${action}`,
      })
      .then(
        (result) => {
          this.spinner.show();
          const newState = !schedule.is_enabled;
          this.adminService
            .toggleScheduleActiveState(schedule.id, newState)
            .subscribe(
              (res) => {
                this.notify.showSuccess(
                  `Schedule enabled state is now: '${res.enabled}'`,
                );
                schedule.is_enabled = res.enabled;
                this.data = [...this.data];
              },
              (error) => {
                this.notify.showError(error);
              },
            )
            .add(() => {
              this.spinner.hide();
            });
        },
        (reason) => {},
      );
  }
}
