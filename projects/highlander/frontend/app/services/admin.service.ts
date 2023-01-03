import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "@rapydo/services/api";
import { Schedule, OnOffSchedule } from "@app/types";

@Injectable({
  providedIn: "root",
})
export class AdminService {
  constructor(private api: ApiService) {}

  // --------------------------------
  // System Schedules
  // --------------------------------

  getSchedules(): Observable<Schedule[]> {
    return this.api.get<Schedule[]>("/api/admin/schedules");
  }

  addSchedule(schedule: Schedule) {
    return this.api.post<Schedule>("/api/admin/schedules");
  }

  /**
   * Change the schedule state in "enabled" or "disabled".
   * @param id schedule ID
   * @param state the new state
   */
  toggleScheduleActiveState(
    scheduleId,
    toState: boolean,
  ): Observable<OnOffSchedule> {
    console.debug(
      `Changing state for schedule <${scheduleId}> in '${toState}'`,
    );
    const data = {
      is_enabled: toState,
    };
    return this.api.patch(`/api/admin/schedules/${scheduleId}`, data);
  }
}
