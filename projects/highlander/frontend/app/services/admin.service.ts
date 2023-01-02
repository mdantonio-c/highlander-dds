import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { delay } from "rxjs/operators";
import { ApiService } from "@rapydo/services/api";
import { Schedule } from "@app/types";

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
  changeScheduleState(id: number, state: boolean): Observable<boolean> {
    console.log(`Changing state for schedule <${id}> in '${state}'`);
    // TODO
    return of(state).pipe(delay(1000));
  }
}
